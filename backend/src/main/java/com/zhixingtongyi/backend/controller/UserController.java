package com.zhixingtongyi.backend.controller;

import com.zhixingtongyi.backend.common.annotation.RequiresRoles;
import com.zhixingtongyi.backend.common.context.UserContext;
import com.zhixingtongyi.backend.common.result.PageResult;
import com.zhixingtongyi.backend.common.result.Result;
import com.zhixingtongyi.backend.model.dto.UserDTO;
import com.zhixingtongyi.backend.model.vo.UserVO;
import com.zhixingtongyi.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

@RestController
@Slf4j
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    @RequiresRoles(0)
    public Result<PageResult<UserVO>> getUsers(@RequestParam(defaultValue = "1") int pageNum,
                                               @RequestParam(defaultValue = "10") int pageSize) {
        PageResult<UserVO> userInfos = userService.getUsersPage(pageNum, pageSize);
        return Result.success(userInfos);
    }

    @GetMapping("/users/{id}")
    @RequiresRoles(0)
    public Result<UserVO> getUserById(@PathVariable Long id) {
        UserVO userInfo = userService.getUserById(id);
        return Result.success(userInfo);
    }

    @GetMapping("/users/search")
    @RequiresRoles(0)
    public Result<UserVO> getUserByUsername(@RequestParam String username) {
        UserVO userInfo = userService.getUserByUsername(username);
        return Result.success(userInfo);
    }

    @PutMapping("/users/{id}")
    @RequiresRoles(0)
    public Result<Void> updateUserById(@PathVariable Long id,
                                       @Valid @RequestBody UserDTO userDto) {
        userService.updateUserById(id, userDto);
        return Result.success();
    }

    @DeleteMapping("/users/{id}")
    @RequiresRoles(0)
    public Result<Void> removeUserById(@PathVariable Long id) {
        userService.removeUserById(id);
        return Result.success();
    }

    @GetMapping("/user/profile")
    @RequiresRoles({0, 1, 2, 3})
    public Result<UserVO> getProfile() {
        UserVO userInfo = userService.getUserById(UserContext.getUserId());
        return Result.success(userInfo);
    }

    @PutMapping("/user/profile")
    @RequiresRoles({0, 1, 2, 3})
    public Result<UserVO> updateProfile(@Valid @RequestBody UserDTO userDto) {
        userService.updateUserById(UserContext.getUserId(), userDto);
        return Result.success();
    }
}
