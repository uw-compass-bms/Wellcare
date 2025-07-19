import { sendEmail } from './resend-client';
import { supabase } from '@/lib/supabase/client';

interface SendFinalPDFEmailsParams {
  taskId: string;
  taskTitle: string;
  files: Array<{
    fileName: string;
    downloadUrl: string;
  }>;
}

/**
 * 发送包含最终签名PDF的邮件给所有收件人和任务创建者
 */
export async function sendFinalPDFEmails({
  taskId,
  taskTitle,
  files
}: SendFinalPDFEmailsParams) {
  try {
    // 1. 获取所有收件人
    const { data: recipients, error: recipientsError } = await supabase
      .from('signature_recipients')
      .select('name, email')
      .eq('task_id', taskId);

    if (recipientsError || !recipients) {
      console.error('Failed to fetch recipients:', recipientsError);
      return;
    }

    // 2. 获取任务创建者信息（如果需要）
    const { data: task } = await supabase
      .from('signature_tasks')
      .select('user_id')
      .eq('id', taskId)
      .single();

    // 3. 构建文件列表HTML
    const fileListHtml = files.map(file => `
      <li style="margin: 10px 0;">
        <strong>${file.fileName}</strong><br>
        <a href="${file.downloadUrl}" style="color: #0066cc; text-decoration: none;">
          Download Signed PDF
        </a>
      </li>
    `).join('');

    // 4. 发送邮件给每个收件人
    const emailPromises = recipients.map(recipient => 
      sendEmail({
        to: recipient.email,
        subject: `All Signatures Completed - ${taskTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">All Signatures Completed!</h2>
            
            <p>Dear ${recipient.name},</p>
            
            <p>We're pleased to inform you that all parties have completed signing the document(s) for:</p>
            <p style="font-size: 18px; font-weight: bold; color: #0066cc;">${taskTitle}</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Signed Documents:</h3>
              <ul style="list-style: none; padding: 0;">
                ${fileListHtml}
              </ul>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              <strong>Note:</strong> Download links will expire in 24 hours. 
              Please download and save your copies for your records.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px;">
              This is an automated email from UW Compass Signature System.<br>
              Completed on: ${new Date().toLocaleString()}
            </p>
          </div>
        `,
        text: `All signatures completed for ${taskTitle}. 
        
Signed documents are ready for download:
${files.map(f => `- ${f.fileName}: ${f.downloadUrl}`).join('\n')}

Note: Download links will expire in 24 hours.`
      })
    );

    // 5. 执行所有邮件发送
    const results = await Promise.allSettled(emailPromises);
    
    // 6. 记录结果
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Final PDF emails sent: ${successCount} successful, ${failureCount} failed`);
    
    if (failureCount > 0) {
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to send email to ${recipients[index].email}:`, result.reason);
        }
      });
    }

    return {
      success: true,
      sent: successCount,
      failed: failureCount
    };

  } catch (error) {
    console.error('Error sending final PDF emails:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}