package com.zhixingtongyi.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.zhixingtongyi.backend.common.context.UserContext;
import com.zhixingtongyi.backend.common.exception.BusinessException;
import com.zhixingtongyi.backend.model.converter.UserConverter;
import com.zhixingtongyi.backend.model.dto.WechatServerResponse;
import com.zhixingtongyi.backend.model.dto.WechatLoginRequest;
import com.zhixingtongyi.backend.model.entity.User;
import com.zhixingtongyi.backend.service.AuthService;
import com.zhixingtongyi.backend.service.UserService;
import com.zhixingtongyi.backend.utils.JwtUtils;
import com.zhixingtongyi.backend.utils.PasswordUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.concurrent.TimeUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final UserConverter userConverter;
    private final JwtUtils jwtUtils;
    private final PasswordUtils passwordUtils;
    private final RedisTemplate<String, Object> redisTemplate;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${wechat.app-id}")
    private String appid;
    @Value("${wechat.secret}")
    private String secret;

    /*
    // 使用账号密码的注册
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void register(RegisterRequest registerRequest) {

        // 检查用户名是否已存在
        User user = userService.getOne(new LambdaQueryWrapper<User>().eq(User::getUsername, registerRequest.getUsername()));
        if(user != null) {
            throw new BusinessException(500, "用户已存在");
        }

        // 创建新用户
        user = userConverter.toEntity(registerRequest);
        user.setPassword(passwordUtils.encode(registerRequest.getPassword()));

        userService.save(user);
    }

    // 使用账号密码的登录
    @Override
    public String login(LoginRequest loginRequest) {
        String username = loginRequest.getUsername();
        String password = loginRequest.getPassword();

        // 检查用户是否存在
        User user = userService.getOne(new LambdaQueryWrapper<User>().eq(User::getUsername, username));
        if(user == null) {
            throw new BusinessException(500, "用户不存在");
        }

        // 验证密码
        if(passwordUtils.matches(password, user.getPassword())) {
            Long id =  user.getId();
            String token = jwtUtils.generateToken(id, null, user.getUsername());

            // 将 token 存入 redis，有效期 30 min，实现自动续期
            redisTemplate.opsForValue().set("auth:token:" + id, token, 30, TimeUnit.MINUTES);

            // 将角色存入 redis (用于权限校验)，有效期和 token 相同
            int role = user.getRole();
            redisTemplate.opsForValue().set("auth:role:" + id, role, 30, TimeUnit.MINUTES);

            return token;
        } else {
            throw new BusinessException(500, "密码错误");
        }
    }

     */

    // 使用微信的登录（自动注册）
    @Override
    @Transactional(rollbackFor = Exception.class)
    public String wechatLogin(WechatLoginRequest wechatLoginRequest) {
        String url = String.format(
                "https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
                appid, secret, wechatLoginRequest.getCode()
        );
        WechatServerResponse response = restTemplate.getForObject(url, WechatServerResponse.class);

        if (response == null) {
            throw new BusinessException(500, "微信服务器返回空响应");
        }

        // 检查用户是否已存在，如果不存在，自动注册
        User user = userService.getOne(new LambdaQueryWrapper<User>().eq(User::getWechatOpenid, response.openId));
        if(user == null) {
            // 创建新用户
            user = userConverter.toEntity(wechatLoginRequest);
            user.setWechatOpenid(response.openId);
            // 先禁用，等待审核
            user.setStatus(0);

            userService.save(user);
        }

        Long id = user.getId();
        String openId = user.getWechatOpenid();
        String token = jwtUtils.generateToken(id, openId, user.getUsername());

        // 将 token 存入 redis，有效期 7 day，实现自动续期
        redisTemplate.opsForValue().set("auth:token:" + id, token, 7, TimeUnit.DAYS);

        // 将角色存入 redis (用于权限校验)，有效期和 token 相同
        int role = user.getRole();
        redisTemplate.opsForValue().set("auth:role:" + id, role, 7, TimeUnit.DAYS);

        return token;
    }

    @Override
    public void logout() {
        Long id = UserContext.getUserId();
        if (id == null) {
            return;
        }

        // 清空 context
        String redisKey = "auth:token:" + id;
        redisTemplate.delete(redisKey);
        redisKey = "auth:role:" + id;
        redisTemplate.delete(redisKey);
    }
}
