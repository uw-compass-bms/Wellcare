# 📘 CSIO eDoc API Prompt Sheet

> **For Ontario Insurance BMS System Developers**

This document consolidates all CSIO-related eDoc standard codes, API authentication requirements, security compliance, and maintenance process recommendations. It is intended for developers building SaaS or BMS systems supporting CSIO JSON API and eDocs interfaces.

---

## 🧾 Policy Transaction eDoc Codes
| Code | Description                             | Type                             |
|------|-----------------------------------------|----------------------------------|
| NBD  | New Business Policy Declaration         | Policy declaration – new policy  |
| NBL  | New Business Liability Certificates     | Liability certificate – new      |
| PCD  | Policy Change Policy Declaration        | Declaration/endorsement          |
| PCL  | Policy Change Liability Certificates    | Liability certificate – change   |
| RED  | Renewal Policy Declaration              | Declaration – renewal            |
| REL  | Renewal Liability Certificates          | Liability – renewal              |
| RSD  | Reissue Policy Declaration              | Declaration – reissue            |
| RSL  | Reissue Liability Certificates          | Liability – reissue              |
| RRD  | Rewrite Policy Declaration              | Declaration – rewrite            |
| RRL  | Rewrite Liability Certificates          | Liability – rewrite              |
| RND  | Reinstatement Policy Declaration        | Declaration – reinstatement      |
| RNL  | Reinstatement Liability Certificates    | Liability – reinstatement        |

---

## 💵 Billing eDoc Codes
| Code | Description                                | Type                                  |
|------|--------------------------------------------|---------------------------------------|
| NBP  | New Business Payment Schedule              | Payment with new business policy      |
| PCP  | Policy Change Payment Schedule             | Payment with policy change            |
| REP  | Renewal Payment Schedule                   | Payment with renewal                  |
| RSP  | Reissue Payment Schedule                   | Payment with reissue                  |
| RRP  | Rewrite Payment Schedule                   | Payment with rewrite                  |
| RNP  | Reinstatement Payment Schedule             | Payment with reinstatement            |
| NTP  | Payment Schedule No Policy Transaction     | Payment schedule only                 |
| BWR  | Billing Withdrawal Rejection Notice        | Payment returned (no cancel)          |
| BOP  | Billing Overdue Payment Notice             | Past due reminder                     |
| BFB  | Billing Final Bill Notice                  | Final cancellation reminder           |
| BRI  | Billing Refund Issued                      | Refund issued                         |
| BRE  | Payment Received and Policy Reinstated     | Cancellation rescinded                |
| BOB  | Payment Required Outstanding Balance       | Balance on cancelled policy           |
| BCN  | Billing Collection Notice                  | Collection notice                     |
| BCE  | Billing Credit Card Expired                | Credit card expired notice            |

---

## ❌ Cancellation and Lapse eDoc Codes
| Code | Description                                          | Type                          |
|------|------------------------------------------------------|-------------------------------|
| XRW  | Insurer Non-Renewal                                  | Notice of non-renewal         |
| XOR  | Insurer Cancellation w/ Option to Reinstate          | Pending cancel (reinstatable) |
| XNR  | Insurer Cancellation w/o Option to Reinstate         | Pending cancel (no reinst.)   |
| XRI  | Cancellation Request by Insured                      | Insured-initiated cancellation|
| XIN  | Cancelled by Insurer                                 | Final cancellation notice     |

---

## 💼 Underwriting Request eDoc Code
| Code | Description         | Type                                               |
|------|---------------------|----------------------------------------------------|
| UWR  | Underwriting Request| Request for photos, docs, questionnaires, or forms |

---

## 📂 Claims eDoc Codes
| Code | Description                   | Type                                       |
|------|-------------------------------|--------------------------------------------|
| CON  | Claim Opening Notice          | Opening/re-opening of claim                |
| CCN  | Claim Closing Notice          | Final closing of claim                     |
| CAA  | Claim Adjuster Assignment     | Adjuster assigned/reassigned               |
| CRN  | Claim Auto Rental Notice      | Auto rental status                         |
| CTL  | Claim Total Loss Notice       | Vehicle total loss                         |
| CFD  | Claim Auto Fault Determination| Fault/liability assessment                 |
| CPN  | Claim Payment Notice          | Payment status to insured                  |

---

## 🔐 CSIO API Security Authentication Essentials

### OIDC Authorization Methods (Choose One)
- Authorization Code Flow
- PKCE Flow (Proof Key for Code Exchange)
- Client Credentials Grant

### 14 Must-Defend OAuth Risks
- CSRF (跨站请求伪造)
- Token Replay (令牌重放)
- Clickjacking (点击劫持)
- Credential Leakage Prevention (防止凭证泄露)
- PKCE Downgrade Attack (PKCE 降级攻击)
- ...and others (详见CSIO官方文档)

### 17 Must-Defend API Endpoint Security Issues
- DDoS (分布式拒绝服务)
- XSS (跨站脚本攻击)
- CSRF/CORS (跨站请求/资源共享)
- SQL Injection (SQL注入)
- Broken Authentication (失效认证)
- Insufficient Logging/Monitoring (日志监控不足)
- Authorization Failures (权限验证失败)
- ...and others (详见CSIO官方文档)

---

## 📋 CSIO JSON API Certification Process Summary

### Step 1: Application Submission
- Fill out the [Certification Application Form](https://csio.com/system/files/private-document/2024-09/Application%20Form-Final.pdf)  
  // 提交认证申请表
- Submit request/response JSON samples  
  // 提交请求/响应JSON示例
- Provide URI/Path/Headers parameter documentation  
  // 提供接口参数文档

### Step 2: Review
- Documentation review (format + content)  
  // 文档格式和内容审核
- Demo (Postman + Web meeting)  
  // 线上演示

### Step 3: Certification
- All APIs must meet standards to pass  
  // 所有API必须符合标准
- Successful applicants receive certificate + logo for marketing  
  // 通过者可获证书和Logo

### Step 4: Maintenance
- API or platform updates must be reported to CSIO  
  // 平台或API更新需报告CSIO
- Security incidents must be reported promptly  
  // 安全事件需及时报告

---

## 🔁 How to Submit New Code/Modifications (MR Process)
1. Log in to CSIO maintenance tool to submit MR  
   // 登录CSIO维护工具提交MR
2. Provide business context + technical requirements  
   // 提供业务背景和技术需求
3. CSIO Working Group monthly review (approve, defer, or return)  
   // 月度评审，可能通过、推迟或退回
4. Once approved, code is effective immediately  
   // 通过后立即生效
5. Biannual standard releases will formally include all approved changes  
   // 每年两次标准发布正式纳入变更

**Applicable to:**
- Adding new eDoc Codes  
  // 增加新eDoc编码
- Removing non-compliant Z-codes  
  // 删除不合规Z-code
- Supplementing Commercial Lines business fields  
  // 补充商业险业务字段

Maintenance Portal: [https://csio.com/solutions-tools/data-standards/standards-maintenance-requests](https://csio.com/solutions-tools/data-standards/standards-maintenance-requests)

---

## 📝 Prompt Examples
- If a document includes 'Final cancellation notice', return `XIN`.  
  // 如果文档包含"Final cancellation notice"，返回`XIN`
- Given a document titled 'Policy Declaration – New Business Policy', return the code `NBD`.  
  // 如果文档标题为"Policy Declaration – New Business Policy"，返回`NBD`

---

> **All developers must follow these rules to ensure CSIO compliance for Ontario insurance BMS systems.** 