/**
 * 阿里云 OSS 直传工具（基于服务端签名）
 *
 * 使用流程：
 *   1. 调用后端 POST /oss/token 获取 policy + signature
 *   2. 使用 wx.uploadFile 直传到 OSS（PostObject 方式）
 *
 * 支持的 businessType：
 *   AVATAR       - 用户头像
 *   CHAT_IMAGE   - 聊天图片
 *   CHAT_VOICE   - 聊天语音
 *   EVIDENCE     - 志愿时长凭证
 *   MEETING_RECORD - 会议录制
 */
const { ossApi } = require("./api");

/**
 * 选择图片并上传到 OSS
 * @param {object} options
 * @param {string} options.businessType - OSS 业务类型
 * @param {number} [options.count=1] - 最多选几张
 * @param {string[]} [options.sizeType] - 压缩类型 ['original', 'compressed']
 * @param {string[]} [options.sourceType] - 来源 ['album', 'camera']
 * @returns {Promise<string[]>} 上传成功后的 OSS URL 数组
 */
function chooseAndUploadImages(options) {
  var businessType = options && options.businessType;
  var count = (options && options.count) || 1;
  var sizeType = (options && options.sizeType) || ["compressed", "original"];
  var sourceType = (options && options.sourceType) || ["album", "camera"];

  return new Promise(function (resolve, reject) {
    wx.chooseMedia({
      count: count,
      mediaType: ["image"],
      sizeType: sizeType,
      sourceType: sourceType,
      success: function (res) {
        var files = (res && res.tempFiles) || [];
        if (!files.length) {
          reject(new Error("未选择图片"));
          return;
        }
        var paths = files.map(function (f) { return f.tempFilePath; });
        uploadFiles({ businessType: businessType, filePaths: paths })
          .then(resolve)
          .catch(reject);
      },
      fail: function (err) {
        if (err && err.errMsg && err.errMsg.indexOf("cancel") >= 0) {
          reject(new Error("用户取消"));
        } else {
          reject(err || new Error("选择图片失败"));
        }
      }
    });
  });
}

/**
 * 选择文件并上传到 OSS（聊天文件等）
 * @param {object} options
 * @param {string} options.businessType - OSS 业务类型
 * @param {number} [options.count=1] - 最多选几个
 * @param {string} [options.extension] - 文件扩展名限制，如 ".pdf,.doc,.docx"
 * @returns {Promise<string[]>} 上传成功后的 OSS URL 数组
 */
function chooseAndUploadFiles(options) {
  var businessType = options && options.businessType;
  var count = (options && options.count) || 1;

  return new Promise(function (resolve, reject) {
    wx.chooseMessageFile({
      count: count,
      type: "file",
      success: function (res) {
        var files = (res && res.tempFiles) || [];
        if (!files.length) {
          reject(new Error("未选择文件"));
          return;
        }
        // 文件大小限制 5MB
        var MAX_SIZE = 5 * 1024 * 1024;
        for (var i = 0; i < files.length; i++) {
          if (files[i].size && files[i].size > MAX_SIZE) {
            reject(new Error("文件不能超过 5MB"));
            return;
          }
        }
        var paths = files.map(function (f) { return f.path; });
        var names = files.map(function (f) { return f.name || ""; });
        uploadFiles({ businessType: businessType, filePaths: paths, fileNames: names })
          .then(resolve)
          .catch(reject);
      },
      fail: function (err) {
        if (err && err.errMsg && err.errMsg.indexOf("cancel") >= 0) {
          reject(new Error("用户取消"));
        } else {
          reject(err || new Error("选择文件失败"));
        }
      }
    });
  });
}

/**
 * 批量上传本地文件到 OSS
 * @param {object} options
 * @param {string} options.businessType - OSS 业务类型
 * @param {string[]} options.filePaths - 本地临时文件路径数组
 * @param {string[]} [options.fileNames] - 原始文件名数组（用于保留扩展名）
 * @returns {Promise<string[]>} OSS URL 数组
 */
function uploadFiles(options) {
  var businessType = options && options.businessType;
  var filePaths = (options && options.filePaths) || [];
  var fileNames = (options && options.fileNames) || [];

  if (!businessType) return Promise.reject(new Error("businessType 不能为空"));
  if (!filePaths.length) return Promise.reject(new Error("没有文件需要上传"));

  return ossApi.getToken(businessType).then(function (token) {
    if (!token || !token.accessKeyId || !token.policy || !token.signature) {
      throw new Error("获取上传签名失败");
    }
    var tasks = filePaths.map(function (filePath, idx) {
      return _uploadSingle(token, filePath, fileNames[idx] || "");
    });
    return Promise.all(tasks);
  });
}

/**
 * 上传单个文件到 OSS（服务端签名直传）
 * @param {object} token - 后端返回的签名信息
 * @param {string} filePath - 本地临时文件路径
 * @param {string} [fileName] - 原始文件名
 * @returns {Promise<string>} OSS 完整 URL
 */
function _uploadSingle(token, filePath, fileName) {
  // 保留原始文件名，前缀加时间戳避免重名
  var originalName = _sanitizeFileName(fileName || _extractFileName(filePath));
  var key = token.dir + Date.now() + "_" + originalName;
  var host = token.host || ("https://" + token.bucket + "." + token.endpoint.replace(/^https?:\/\//, ""));

  return new Promise(function (resolve, reject) {
    wx.uploadFile({
      url: host,
      filePath: filePath,
      name: "file",
      formData: {
        key: key,
        policy: token.policy,
        OSSAccessKeyId: token.accessKeyId,
        signature: token.signature,
        success_action_status: "200"
      },
      success: function (res) {
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve(host + "/" + key);
        } else {
          reject(new Error("上传失败，状态码: " + res.statusCode));
        }
      },
      fail: function (err) {
        reject(err || new Error("上传请求失败"));
      }
    });
  });
}

/**
 * 从文件路径提取文件名
 */
function _extractFileName(path) {
  if (!path) return "file";
  var seg = path.split("/").pop() || path.split("\\").pop() || "file";
  return seg.split("?")[0] || "file";
}

/**
 * 清理文件名中不安全的字符（保留中文、字母、数字、点、下划线、横线）
 */
function _sanitizeFileName(name) {
  if (!name) return "file";
  // 去掉路径分隔符和特殊字符，保留常见字符
  var clean = name.replace(/[\/\\:*?"<>|#%&{}$!@`]/g, "_");
  // 如果清理后为空或只有下划线
  if (!clean || /^_+$/.test(clean)) return "file";
  return clean;
}

module.exports = {
  chooseAndUploadImages: chooseAndUploadImages,
  chooseAndUploadFiles: chooseAndUploadFiles,
  uploadFiles: uploadFiles
};
