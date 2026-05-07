package com.rural.education.utils;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.rural.education.exception.AuthException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret:change-me-in-env}")
    private String secret;

    @Value("${jwt.expiration:86400000}")
    private Long expiration;

    public String generateToken(Long userId, Integer role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        
        return JWT.create()
                .withClaim("userId", userId)
                .withClaim("role", role)
                .withIssuedAt(now)
                .withExpiresAt(expiryDate)
                .sign(Algorithm.HMAC256(secret));
    }

    public DecodedJWT verifyToken(String token) {
        try {
            return JWT.require(Algorithm.HMAC256(secret)).build().verify(token);
        } catch (Exception e) {
            throw new AuthException("无效或已过期的 Token");
        }
    }

    public Long getUserIdFromToken(String token) {
        return verifyToken(token).getClaim("userId").asLong();
    }

    public Integer getRoleFromToken(String token) {
        return verifyToken(token).getClaim("role").asInt();
    }
}
