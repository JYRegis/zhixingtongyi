package com.zhixingtongyi.backend.common.aspect;

import com.zhixingtongyi.backend.common.annotation.RequiresRoles;
import com.zhixingtongyi.backend.common.context.UserContext;
import com.zhixingtongyi.backend.common.exception.BusinessException;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class PermissionAspect {
    @Around("@annotation(roles)")
    public Object check(ProceedingJoinPoint joinPoint, RequiresRoles roles) throws Throwable {
        int[] requireRoles = roles.value();
        // 从 UserContext 中获取当前用户的角色
        String userRole = UserContext.getRole();

        for (int role : requireRoles) {
            if (userRole.equals(role)) {
                return joinPoint.proceed();
            }
        }

        throw new BusinessException(403, "你没有权限进行此操作");
    }
}
