package com.zhixingtongyi.backend.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.zhixingtongyi.backend.common.result.PageResult;
import com.zhixingtongyi.backend.model.dto.UserDTO;
import com.zhixingtongyi.backend.model.entity.User;
import com.zhixingtongyi.backend.model.vo.UserVO;

public interface UserService extends IService<User> {
    PageResult<UserVO> getUsersPage(int pageNum, int pageSize);

    UserVO getUserById(Long id);

    UserVO getUserByUsername(String username);



    void updateUserById(Long id, UserDTO userDto);

    void removeUserById(Long id);
}