# KrakenD Performance Monitoring & Observability Guide

**Last Updated:** June 15, 2025  
**Monitoring Version:** 2.0  
**Stack:** KrakenD Gateway  

## Overview

This guide covers comprehensive performance monitoring, observability, and troubleshooting strategies for the KrakenD Gateway, including metrics collection, distributed tracing, logging, alerting, and performance optimization techniques.

## 📊 Metrics & Monitoring

### Core Performance Metrics

```json
{
  "extra_config": {
    "telemetry/metrics": {
      "collection_time": "60s",
      "proxy_disabled": false,
      "router_disabled": false,
      "backend_disabled": false,
      "endpoint_disabled": false,
      "listen_address": ":8090",
      "namespace": "krakend",
      "prometheus": {
        "namespace": "krakend_gateway",
        "subsystem": "api"
      }
    }
  }
}
```

### Key Performance Indicators

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `krakend_requests_total` | Total requests processed | > 10,000/min |
| `krakend_request_duration_seconds` | Request latency | P95 > 2s |
| `krakend_backend_errors_total` | Backend error count | > 100/min |
| `krakend_auth_failures_total` | Authentication failures | > 50/min |
| `krakend_rate_limit_hits_total` | Rate limit violations | > 200/min |
| `krakend_circuit_breaker_open` | Circuit breaker status | Any open |

### Custom Metrics Configuration

```json
{
  "extra_config": {
    "telemetry/metrics": {
      "collection_time": "30s",
      "custom_metrics": [
        {
          "name": "plugin_requests_total",
          "help": "Total requests per plugin",
          "type": "counter",
          "labels": ["plugin_id", "domain", "project", "status"]
        },
        {
          "name": "auth_token_validation_duration",
          "help": "Time spent validating JWT tokens", 
          "type": "histogram",
          "buckets": [0.1, 0.5, 1.0, 2.0, 5.0]
        },
        {
          "name": "backend_service_availability",
          "help": "Backend service availability",
          "type": "gauge",
          "labels": ["service", "endpoint"]
        }
      ]
    }
  }
}
```

## 🔍 Distributed Tracing

### OpenTelemetry Integration

```json
{
  "extra_config": {
    "telemetry/opencensus": {
      "sample_rate": 100,
      "reporting_period": 1,
      "enabled_layers": {
        "backend": true,
        "router": true,
        "pipe": true
      },
      "exporters": {
        "jaeger": {
          "endpoint": "http://jaeger-collector.monitoring:14268/api/traces",
          "service_name": "krakend-gateway",
          "buffer_max_count": 1000
        },
        "zipkin": {
          "collector_url": "http://zipkin.monitoring:9411/api/v2/spans",
          "service_name": "krakend-gateway"
        }
      }
    }
  }
}
```

### Trace Correlation

```json
{
  "extra_config": {
    "modifier/jmespath": {
      "expr": "{
        trace_id: @.headers['X-Trace-ID'][0] || `uuid()`,
        span_id: @.headers['X-Span-ID'][0] || `uuid()`,
        parent_span_id: @.headers['X-Parent-Span-ID'][0],
        request_data: @
      }"
    }
  }
}
```

### Custom Span Attributes

```go
// Custom span attributes in auth plugin
func (p *AuthPlugin) addTraceAttributes(ctx context.Context, userID, pluginID string) {
    span := trace.FromContext(ctx)
    if span != nil {
        span.SetAttributes(
            attribute.String("user.id", userID),
            attribute.String("plugin.id", pluginID),
            attribute.String("domain.code", p.getDomainCode()),
            attribute.String("auth.method", "jwt"),
        )
    }
}
```

## 📝 Structured Logging

### JSON Logging Configuration

```json
{
  "extra_config": {
    "telemetry/logging": {
      "level": "INFO",
      "prefix": "[KRAKEND]",
      "syslog": false,
      "stdout": true,
      "format": "json",
      "custom_format": "{
        \"timestamp\": \"{{.Timestamp}}\",
        \"level\": \"{{.Level}}\",
        \"message\": \"{{.Message}}\",
        \"service\": \"krakend-gateway\",
        \"instance_id\": \"{{env \"HOSTNAME\"}}\",
        \"version\": \"{{env \"KRAKEND_VERSION\"}}\"
      }"
    }
  }
}
```

### Request/Response Logging

```json
{
  "extra_config": {
    "telemetry/logging": {
      "level": "DEBUG",
      "include_request": true,
      "include_response": true,
      "sanitize_headers": ["Authorization", "X-API-Key"],
      "max_body_size": 1024,
      "log_request_body": false,
      "log_response_body": false
    }
  }
}
```

### Security Event Logging

```go
// Security event logging in auth plugin
type SecurityEvent struct {
    Timestamp   time.Time `json:"timestamp"`
    Event       string    `json:"event"`
    UserID      string    `json:"user_id,omitempty"`
    IP          string    `json:"client_ip"`
    UserAgent   string    `json:"user_agent"`
    Endpoint    string    `json:"endpoint"`
    Result      string    `json:"result"`
    Reason      string    `json:"reason,omitempty"`
    PluginID    string    `json:"plugin_id,omitempty"`
    DomainCode  string    `json:"domain_code,omitempty"`
}

func (p *AuthPlugin) logSecurityEvent(event SecurityEvent) {
    eventJSON, _ := json.Marshal(event)
    p.logger.WithField("security_event", string(eventJSON)).Info("Security event logged")
}
```

## 🚨 Alerting & Monitoring

### Prometheus Alert Rules

```yaml
groups:
  - name: krakend-gateway
    rules:
      - alert: HighRequestLatency
        expr: histogram_quantile(0.95, krakend_request_duration_seconds_bucket) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High request latency detected"
          description: "95th percentile latency is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(krakend_backend_errors_total[5m]) > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      - alert: AuthenticationFailures
        expr: rate(krakend_auth_failures_total[5m]) > 5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "High authentication failure rate"
          description: "Auth failure rate is {{ $value }} failures/second"

      - alert: CircuitBreakerOpen
        expr: krakend_circuit_breaker_open > 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: "Circuit breaker is open"
          description: "Circuit breaker for {{ $labels.service }} is open"
```

### Health Check Monitoring

```json
{
  "endpoint": "/health",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/health",
      "host": ["localhost:8080"],
      "method": "GET"
    }
  ],
  "extra_config": {
    "modifier/jmespath": {
      "expr": "{
        status: \"healthy\",
        timestamp: `now()`,
        version: \"{{env \"KRAKEND_VERSION\"}}\",
        uptime: @.uptime,
        services: {
          briggsbase: @.services.briggsbase.status,
          cdc: @.services.cdc.status,
          keycloak: @.services.keycloak.status
        }
      }"
    }
  }
}
```

### Custom Health Checks

```go
// Service health checker
type HealthChecker struct {
    services map[string]ServiceHealth
    timeout  time.Duration
}

type ServiceHealth struct {
    Name     string    `json:"name"`
    Status   string    `json:"status"`
    LastCheck time.Time `json:"last_check"`
    Response time.Duration `json:"response_time"`
    Error    string    `json:"error,omitempty"`
}

func (hc *HealthChecker) CheckHealth(ctx context.Context) map[string]ServiceHealth {
    results := make(map[string]ServiceHealth)
    
    for serviceName, serviceURL := range hc.services {
        start := time.Now()
        health := ServiceHealth{
            Name:      serviceName,
            LastCheck: start,
        }
        
        resp, err := http.Get(serviceURL + "/health")
        if err != nil {
            health.Status = "unhealthy"
            health.Error = err.Error()
        } else {
            health.Status = "healthy"
            health.Response = time.Since(start)
            resp.Body.Close()
        }
        
        results[serviceName] = health
    }
    
    return results
}
```

## 📈 Performance Analytics

### Request Pattern Analysis

```json
{
  "extra_config": {
    "telemetry/analytics": {
      "collection_interval": "1m",
      "metrics": [
        {
          "name": "request_patterns",
          "dimensions": ["endpoint", "method", "user_agent", "domain"],
          "aggregation": "count"
        },
        {
          "name": "user_behavior",
          "dimensions": ["user_id", "plugin_id", "domain", "action"],
          "aggregation": "count"
        },
        {
          "name": "plugin_usage",
          "dimensions": ["plugin_id", "domain", "project", "hour"],
          "aggregation": "sum"
        }
      ]
    }
  }
}
```

### Performance Profiling

```go
// Performance profiler for auth plugin
type PerformanceProfiler struct {
    measurements map[string][]time.Duration
    mutex        sync.RWMutex
}

func (pp *PerformanceProfiler) Measure(operation string, fn func() error) error {
    start := time.Now()
    err := fn()
    duration := time.Since(start)
    
    pp.mutex.Lock()
    pp.measurements[operation] = append(pp.measurements[operation], duration)
    pp.mutex.Unlock()
    
    // Log slow operations
    if duration > 1*time.Second {
        log.WithFields(log.Fields{
            "operation": operation,
            "duration":  duration,
        }).Warn("Slow operation detected")
    }
    
    return err
}

func (pp *PerformanceProfiler) GetStats(operation string) (min, max, avg time.Duration) {
    pp.mutex.RLock()
    defer pp.mutex.RUnlock()
    
    measurements := pp.measurements[operation]
    if len(measurements) == 0 {
        return 0, 0, 0
    }
    
    min = measurements[0]
    max = measurements[0]
    var total time.Duration
    
    for _, d := range measurements {
        if d < min {
            min = d
        }
        if d > max {
            max = d
        }
        total += d
    }
    
    avg = total / time.Duration(len(measurements))
    return min, max, avg
}
```

## 🔧 Performance Optimization

### Connection Pooling Optimization

```json
{
  "extra_config": {
    "backend/http": {
      "idle_connections_per_host": 100,
      "max_idle_connections": 1000,
      "max_connections_per_host": 200,
      "idle_connection_timeout": "90s",
      "response_header_timeout": "30s",
      "expect_continue_timeout": "1s",
      "disable_compression": false,
      "disable_keep_alives": false
    }
  }
}
```

### Caching Strategy

```json
{
  "extra_config": {
    "qos/http-cache": {
      "ttl": "300s",
      "cache_control": true,
      "etag": true,
      "vary": ["Authorization", "X-User-ID", "X-Domain-Code"],
      "shared": true,
      "max_age": 300,
      "private": false
    }
  }
}
```

### Response Compression

```json
{
  "extra_config": {
    "modifier/response-body-generator": {
      "enable_compression": true,
      "compression_level": 6,
      "compression_types": ["application/json", "text/plain", "text/html"],
      "min_length": 1024
    }
  }
}
```

## 🛠️ Debugging & Troubleshooting

### Debug Mode Configuration

```json
{
  "version": 3,
  "debug_endpoint": true,
  "echo_endpoint": true,
  "extra_config": {
    "security/cors": {
      "debug": true
    },
    "telemetry/logging": {
      "level": "DEBUG",
      "include_request": true,
      "include_response": true
    }
  }
}
```

### Request Tracing

```json
{
  "endpoint": "/__debug/trace",
  "method": "GET",
  "output_encoding": "json",
  "backend": [
    {
      "url_pattern": "/__debug/trace",
      "host": ["localhost:8080"]
    }
  ]
}
```

### Error Analysis

```go
// Error analyzer for common issues
type ErrorAnalyzer struct {
    errorCounts map[string]int
    patterns    map[string]*regexp.Regexp
}

func (ea *ErrorAnalyzer) AnalyzeError(err error) ErrorCategory {
    errorMsg := err.Error()
    
    categories := map[string]ErrorCategory{
        "timeout":       {Type: "TIMEOUT", Severity: "HIGH"},
        "unauthorized":  {Type: "AUTH", Severity: "MEDIUM"},
        "not found":     {Type: "ROUTING", Severity: "LOW"},
        "rate limit":    {Type: "RATE_LIMIT", Severity: "MEDIUM"},
        "circuit":       {Type: "CIRCUIT_BREAKER", Severity: "HIGH"},
    }
    
    for pattern, category := range categories {
        if strings.Contains(strings.ToLower(errorMsg), pattern) {
            ea.errorCounts[category.Type]++
            return category
        }
    }
    
    return ErrorCategory{Type: "UNKNOWN", Severity: "MEDIUM"}
}
```

## 📊 Dashboard Configuration

### Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "KrakenD Gateway Performance",
    "panels": [
      {
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(krakend_requests_total[5m])",
            "legendFormat": "Requests/sec"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, krakend_request_duration_seconds_bucket)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, krakend_request_duration_seconds_bucket)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, krakend_request_duration_seconds_bucket)",
            "legendFormat": "P99"
          }
        ]
      },
      {
        "title": "Error Rate by Endpoint",
        "type": "table",
        "targets": [
          {
            "expr": "rate(krakend_backend_errors_total[5m]) by (endpoint)",
            "format": "table"
          }
        ]
      }
    ]
  }
}
```

### Real-time Monitoring Queries

```promql
# Top 10 slowest endpoints
topk(10, avg(rate(krakend_request_duration_seconds_sum[5m])) by (endpoint) / avg(rate(krakend_request_duration_seconds_count[5m])) by (endpoint))

# Authentication failure rate by user
sum(rate(krakend_auth_failures_total[5m])) by (user_id)

# Plugin usage patterns
sum(rate(krakend_plugin_requests_total[1h])) by (plugin_id, domain)

# Backend service availability
avg(up{job="krakend-backends"}) by (service)

# Rate limiting effectiveness
rate(krakend_rate_limit_hits_total[5m]) / rate(krakend_requests_total[5m])
```

## 🔍 Log Analysis Patterns

### ELK Stack Integration

```yaml
# Logstash configuration
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "krakend-gateway" {
    json {
      source => "message"
    }
    
    mutate {
      add_field => { "service_type" => "gateway" }
    }
    
    if [security_event] {
      json {
        source => "security_event"
        target => "security"
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "krakend-logs-%{+YYYY.MM.dd}"
  }
}
```

### Security Event Analysis

```elasticsearch
# High-frequency authentication failures
GET /krakend-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"term": {"security.event": "auth_failure"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "by_ip": {
      "terms": {"field": "security.client_ip"}
    }
  }
}

# Plugin access patterns
GET /krakend-logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"exists": {"field": "security.plugin_id"}},
        {"range": {"@timestamp": {"gte": "now-24h"}}}
      ]
    }
  },
  "aggs": {
    "plugin_usage": {
      "terms": {"field": "security.plugin_id"},
      "aggs": {
        "unique_users": {
          "cardinality": {"field": "security.user_id"}
        }
      }
    }
  }
}
```

## 📚 Monitoring Best Practices

### SLA Definitions

| Metric | SLA Target | Measurement Window |
|--------|------------|-------------------|
| Availability | 99.9% | 30 days |
| Response Time (P95) | < 2 seconds | 24 hours |
| Error Rate | < 0.1% | 24 hours |
| Auth Success Rate | > 99.5% | 24 hours |

### Capacity Planning

```go
// Capacity calculator
type CapacityCalculator struct {
    currentRPS    float64
    targetRPS     float64
    avgResponse   time.Duration
    errorRate     float64
}

func (cc *CapacityCalculator) CalculateRequiredInstances() int {
    // Calculate based on target RPS and response time
    instanceCapacity := 1000.0 / cc.avgResponse.Seconds() // Requests per second per instance
    requiredInstances := math.Ceil(cc.targetRPS / instanceCapacity)
    
    // Add buffer for error handling and spikes
    buffer := 1.2
    return int(requiredInstances * buffer)
}

func (cc *CapacityCalculator) PredictLoad(growthRate float64, timeHorizon time.Duration) float64 {
    months := timeHorizon.Hours() / (24 * 30)
    return cc.currentRPS * math.Pow(1+growthRate, months)
}
```

---

**Related Documentation:**
- `krakend-auth-plugin-development.md` - Custom auth plugin development
- `krakend-service-integration.md` - Service integration patterns
- `krakend-template-system.md` - Template configuration system
- `authentication-architecture-principles.md` - Security architecture
