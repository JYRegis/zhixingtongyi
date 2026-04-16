package com.zhixingtongyi.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
public class RedisConfig {

    @Bean
    @Primary
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> redisTemplate = new RedisTemplate<>();

        redisTemplate.setConnectionFactory(factory);

        // 设置 Key 和 HashKey 的序列化方式为 String (若使用默认的jdk序列化器，会变成乱码，使用 String方便在工具里查看)
        redisTemplate.setKeySerializer(new StringRedisSerializer());
        redisTemplate.setHashKeySerializer(new StringRedisSerializer());

        // 设置 Value 和 HashValue 的序列化方式为 JSON (若使用默认的jdk序列化器，会变成乱码，使用 json方便在工具里查看)
        // 但是使用 json 格式存对象时存在缺点，json 信息里会有 @class 字段用于自动反序列化，会多占用空间
        // 如果要节省空间，使用 StringRedisTemplate（key 和 value 都使用 String序列化），同时手动实现对象的序列化和反序列化
        GenericJackson2JsonRedisSerializer jsonRedisSerializer = new GenericJackson2JsonRedisSerializer();
        redisTemplate.setValueSerializer(jsonRedisSerializer);
        redisTemplate.setHashValueSerializer(jsonRedisSerializer);

        return redisTemplate;
    }
}