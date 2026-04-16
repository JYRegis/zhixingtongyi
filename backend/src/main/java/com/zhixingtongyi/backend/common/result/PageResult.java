package com.zhixingtongyi.backend.common.result;

import com.baomidou.mybatisplus.core.metadata.IPage;
import lombok.Data;

import java.util.List;

@Data
public class PageResult<T> {
    private Long total;       // 总条数
    private List<T> list;      // 数据列表
    private Long pageNum;      // 当前页码
    private Long pageSize;     // 每页条数

    // 静态转换方法：将 MP 的 IPage 转换为自定义的 PageResult
    public static <T> PageResult<T> of(IPage<T> page) {
        PageResult<T> result = new PageResult<>();
        result.setTotal(page.getTotal());
        result.setList(page.getRecords());
        result.setPageNum(page.getCurrent());
        result.setPageSize(page.getSize());
        return result;
    }
}
