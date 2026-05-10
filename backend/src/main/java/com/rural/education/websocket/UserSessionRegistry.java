package com.rural.education.websocket;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class UserSessionRegistry {

    private final ConcurrentHashMap<Long, Set<String>> userSessions = new ConcurrentHashMap<>();

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        if (user != null) {
            Long userId = Long.valueOf(user.getName());
            userSessions.compute(userId, (key, sessions) -> {
                if (sessions == null) {
                    sessions = ConcurrentHashMap.newKeySet();
                }
                sessions.add(accessor.getSessionId());
                return sessions;
            });
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal user = accessor.getUser();
        if (user != null) {
            Long userId = Long.valueOf(user.getName());
            userSessions.computeIfPresent(userId, (key, sessions) -> {
                sessions.remove(accessor.getSessionId());
                return sessions.isEmpty() ? null : sessions;
            });
        }
    }

    public Set<String> getSessionIds(Long userId) {
        return userSessions.getOrDefault(userId, Collections.emptySet());
    }

    public boolean isOnline(Long userId) {
        Set<String> sessions = userSessions.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public int getOnlineCount() {
        return userSessions.size();
    }
}
