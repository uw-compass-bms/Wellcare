"use client";
import React, { useState } from "react";
import { Upload, Button, Card, Typography, Alert, Spin, Descriptions, Table, Tag } from "antd";
import { UploadOutlined, FileTextOutlined, CarOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// MVR数据类型
interface MvrData {
  licence_number: string | null;
  name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  address: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  class: string | null;
  status: string | null;
  conditions: Array<{ date: string | null; description: string }> | null;
  convictions: Array<{ date: string | null; description: string }> | null;
}

// Auto+数据类型
interface AutoPlusData {
  name: string | null;
  licence_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  first_insurance_date: string | null;
  policies: Array<{ policy_period: string; company: string; status: string }> | null;
  claims: Array<{
    claim_number: string;
    date_of_loss: string;
    at_fault: boolean;
    total_claim_amount: string;
    coverage_types: string | null;
  }> | null;
}

type DocumentType = 'mvr' | 'autoplus';
type ExtractedData = MvrData | AutoPlusData;

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [docType, setDocType] = useState<DocumentType | null>(null);

  const handleUpload = async (file: File, type: DocumentType) => {
    setLoading(true);
    setError(null);
    setData(null);
    setDocType(type);

    try {
      // 转换文件为base64
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          const b64 = result.split(',')[1];
          if (b64) resolve(b64);
          else reject(new Error("Failed to extract base64 data"));
        };
        reader.onerror = reject;
      });

      // 调用对应的API
      const endpoint = type === 'mvr' ? '/api/extract-mvr' : '/api/extract-autoplus';
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b64data: b64,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "处理失败");
      }
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 渲染客户基本信息
  const renderBasicInfo = () => {
    if (!data) return null;

    const items = [
      { key: 'name', label: '姓名', children: data.name || 'N/A' },
      { key: 'licence', label: '驾照号码', children: data.licence_number || 'N/A' },
      { key: 'birth', label: '出生日期', children: data.date_of_birth || 'N/A' },
      { key: 'address', label: '地址', children: data.address ? data.address.replace(/\\n/g, ', ') : 'N/A' },
    ];

    // MVR特有字段
    if (docType === 'mvr') {
      const mvrData = data as MvrData;
      items.push(
        { key: 'class', label: '驾照类别', children: mvrData.class || 'N/A' },
        { key: 'status', label: '状态', children: mvrData.status || 'N/A' },
        { key: 'expiry', label: '到期日期', children: mvrData.expiry_date || 'N/A' }
      );
    }

    // Auto+特有字段
    if (docType === 'autoplus') {
      const autoPlusData = data as AutoPlusData;
      items.push(
        { key: 'first_insurance', label: '首次投保日期', children: autoPlusData.first_insurance_date || 'N/A' }
      );
    }

    return (
      <Card title="客户基本信息" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={1} size="small" items={items} />
      </Card>
    );
  };

  // 渲染保单历史 (Auto+)
  const renderPolicies = () => {
    if (docType !== 'autoplus') return null;
    const autoPlusData = data as AutoPlusData;
    if (!autoPlusData.policies || autoPlusData.policies.length === 0) return null;

    const columns = [
      { title: '保单期间', dataIndex: 'policy_period', key: 'policy_period' },
      { title: '保险公司', dataIndex: 'company', key: 'company' },
      { 
        title: '状态', 
        dataIndex: 'status', 
        key: 'status',
        render: (status: string) => (
          <Tag color={status.includes('Cancelled') ? 'red' : 'green'}>{status}</Tag>
        )
      },
    ];

    return (
      <Card title="保单历史" style={{ marginBottom: 16 }}>
        <Table 
          dataSource={autoPlusData.policies.map((policy, index) => ({ ...policy, key: index }))} 
          columns={columns} 
          pagination={false}
          size="small"
        />
      </Card>
    );
  };

  // 渲染理赔记录
  const renderClaims = () => {
    if (docType !== 'autoplus') return null;
    const autoPlusData = data as AutoPlusData;
    if (!autoPlusData.claims || autoPlusData.claims.length === 0) return null;

    const columns = [
      { title: '理赔号', dataIndex: 'claim_number', key: 'claim_number' },
      { title: '出险日期', dataIndex: 'date_of_loss', key: 'date_of_loss' },
      { 
        title: '责任', 
        dataIndex: 'at_fault', 
        key: 'at_fault',
        render: (atFault: boolean) => (
          <Tag color={atFault ? 'red' : 'green'}>{atFault ? '有责' : '无责'}</Tag>
        )
      },
      { title: '理赔金额', dataIndex: 'total_claim_amount', key: 'total_claim_amount' },
      { title: '保险类型', dataIndex: 'coverage_types', key: 'coverage_types' },
    ];

    return (
      <Card title="理赔记录">
        <Table 
          dataSource={autoPlusData.claims.map((claim, index) => ({ ...claim, key: index }))} 
          columns={columns} 
          pagination={false}
          size="small"
        />
      </Card>
    );
  };

  // 渲染违法记录 (MVR)
  const renderViolations = () => {
    if (docType !== 'mvr') return null;
    const mvrData = data as MvrData;
    
    const hasConditions = mvrData.conditions && mvrData.conditions.length > 0;
    const hasConvictions = mvrData.convictions && mvrData.convictions.length > 0;
    
    if (!hasConditions && !hasConvictions) return null;

    return (
      <Card title="驾驶记录">
        {hasConditions && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>驾驶条件:</Text>
            {mvrData.conditions!.map((condition, index) => (
              <div key={index} style={{ marginLeft: 16, marginTop: 4 }}>
                {condition.date && <Text type="secondary">{condition.date} - </Text>}
                <Text>{condition.description}</Text>
              </div>
            ))}
          </div>
        )}
        {hasConvictions && (
          <div>
            <Text strong>违法记录:</Text>
            {mvrData.convictions!.map((conviction, index) => (
              <div key={index} style={{ marginLeft: 16, marginTop: 4 }}>
                {conviction.date && <Text type="secondary">{conviction.date} - </Text>}
                <Text>{conviction.description}</Text>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 24 }}>
      <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
        客户文档提取系统
      </Title>

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        <Card style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <FileTextOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
            <div style={{ marginBottom: 16 }}>
              <Text strong>MVR 文档</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>机动车记录</Text>
            </div>
            <Upload
              beforeUpload={file => { handleUpload(file, 'mvr'); return false; }}
              showUploadList={false}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
            >
              <Button icon={<UploadOutlined />} block>
                上传 MVR 文档
              </Button>
            </Upload>
          </div>
        </Card>

        <Card style={{ flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <CarOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
            <div style={{ marginBottom: 16 }}>
              <Text strong>Auto+ 文档</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>保险记录报告</Text>
            </div>
            <Upload
              beforeUpload={file => { handleUpload(file, 'autoplus'); return false; }}
              showUploadList={false}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
            >
              <Button icon={<UploadOutlined />} block>
                上传 Auto+ 文档
              </Button>
            </Upload>
          </div>
        </Card>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>正在处理文档...</Text>
          </div>
        </div>
      )}

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
      )}

      {data && (
        <div>
          {renderBasicInfo()}
          {renderPolicies()}
          {renderClaims()}
          {renderViolations()}
        </div>
      )}
    </div>
  );
}