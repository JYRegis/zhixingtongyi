package com.zhixingtongyi.backend.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class WechatServerResponse {
    @JsonProperty
    public String openId;

    @JsonProperty
    public String sessionKey;
}
