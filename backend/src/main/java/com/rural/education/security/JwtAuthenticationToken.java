package com.rural.education.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collections;
import java.util.List;

public class JwtAuthenticationToken extends AbstractAuthenticationToken {

    private final Long userId;
    private final Integer role;

    public JwtAuthenticationToken(Long userId, Integer role) {
        super(buildAuthorities(role));
        this.userId = userId;
        this.role = role;
        setAuthenticated(true);
    }

    private static List<SimpleGrantedAuthority> buildAuthorities(Integer role) {
        return role != null
                ? List.of(new SimpleGrantedAuthority("ROLE_" + role))
                : Collections.emptyList();
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return userId;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getRole() {
        return role;
    }

    public boolean isL1Admin() {
        return role != null && role == 0;
    }

    public boolean isL2Admin() {
        return role != null && role == 1;
    }
}
