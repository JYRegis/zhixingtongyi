package com.rural.education.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@TableName("algorithm_weight_config")
public class AlgorithmWeightConfig {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String factorName;
    private BigDecimal weight;
    private String description;
    private Integer enabled;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
