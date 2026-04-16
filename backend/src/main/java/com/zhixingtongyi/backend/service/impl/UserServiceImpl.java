package com.zhixingtongyi.backend.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.zhixingtongyi.backend.common.exception.BusinessException;
import com.zhixingtongyi.backend.common.result.PageResult;
import com.zhixingtongyi.backend.model.converter.UserConverter;
import com.zhixingtongyi.backend.model.dto.UserDTO;
import com.zhixingtongyi.backend.model.entity.User;
import com.zhixingtongyi.backend.mapper.UserMapper;
import com.zhixingtongyi.backend.model.vo.UserVO;
import com.zhixingtongyi.backend.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    private final UserMapper userMapper;
    private final UserConverter userConverter;
    private final RedisTemplate redisTemplate;

    public UserServiceImpl(UserMapper userMapper, UserConverter userConverter,  RedisTemplate redisTemplate) {
        this.userMapper = userMapper;
        this.userConverter = userConverter;
        this.redisTemplate = redisTemplate;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserVO> getUsersPage(int pageNum, int pageSize) {
        Page<User> pageParam = new Page<>(pageNum, pageSize);
        Page<User> usersPage = userMapper.selectPage(pageParam, null);
        Page<UserVO> userVOPage = userConverter.toVO(usersPage);

        return PageResult.of(userVOPage);
    }

    @Override
    @Transactional(readOnly = true)
    public UserVO getUserById(Long id) {
        User user = this.getById(id);
        if(user == null) {
            throw new BusinessException(500, "用户不存在");
        }

        return userConverter.toVO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserVO getUserByUsername(String username) {
        if(username == null) {
            throw new BusinessException(500, "参数校验失败");
        }

        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(User::getUsername, username);

        User user = this.getOne(wrapper);
        if(user == null) {
            throw new BusinessException(500, "用户不存在");
        }

        return userConverter.toVO(user);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateUserById(Long id, UserDTO userDto) {
        LambdaUpdateWrapper<User> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(User::getId, id)
                .set(User::getUsername, userDto.getUsername())
                .set(User::getPhone, userDto.getPhone());

        boolean updated = this.update(wrapper);
        if (!updated) {
            throw new BusinessException(500, "用户不存在或更新失败");
        }

        // 清除 redis
        // redisTemplate.delete("auth:token:" + id);
        // redisTemplate.delete("auth:role:" + id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeUserById(Long id) {
        User user = this.getById(id);
        if(user == null) {
            throw new BusinessException(500, "用户不存在");
        }

        this.removeById(id);
    }

}
