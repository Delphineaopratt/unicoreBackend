const nodemailer = require('nodemailer');
const Transcript = require('../models/Transcript');
const VerificationLog = require('../models/VerificationLog');

class TranscriptVerificationService {
  // Configure email transporter
  static getEmailTransporter() {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn('⚠️  Email credentials not configured. Email sending will be skipped.');
      console.warn('   To enable emails, add EMAIL_USER and EMAIL_PASSWORD to .env file');
      return null;
    }

    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Generate 6-digit verification code
   */
  static generateVerificationCode() {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Create verification email template
   */
  static createEmailTemplate(code, studentData) {
    const expirationTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString();

    return {
      subject: `UniCore Transcript Verification Request - Code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">UniCore Transcript Verification</h1>
          </div>
          
          <div style="padding: 20px; background: #f5f5f5; border: 1px solid #ddd;">
            <p>Hello,</p>
            
            <p>A student has requested verification of their academic transcript on the UniCore platform. Please review the details below and enter the verification code if the information is correct.</p>
            
            <div style="background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
              <p><strong>Student Name:</strong> ${studentData.studentName}</p>
              <p><strong>Student Email:</strong> ${studentData.studentEmail}</p>
              <p><strong>Semester:</strong> ${studentData.semester}</p>
              <p><strong>GPA:</strong> ${studentData.gpa}</p>
              <p><strong>School:</strong> ${studentData.school || 'Not specified'}</p>
            </div>
            
            <div style="background: #fffacd; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #666;">Your Verification Code:</p>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px;">
                ${code}
              </p>
            </div>
            
            <p style="color: #666; font-size: 12px;">
              <strong>⏱️ This code expires at:</strong> ${expirationTime}
            </p>
            
            <p style="color: #666;">
              <strong>❓ Next Steps:</strong>
            </p>
            <ol style="color: #666;">
              <li>Log into the UniCore platform</li>
              <li>Navigate to your transcript verification dashboard</li>
              <li>Find the pending verification request</li>
              <li>Enter the 6-digit code above</li>
              <li>Click "Verify" to confirm the transcript</li>
            </ol>
            
            <p style="color: #999; font-size: 12px;">
              If you did not request this verification or have questions, please contact your school's registrar.
            </p>
          </div>
          
          <div style="padding: 10px; background: #333; color: white; font-size: 12px; border-radius: 0 0 5px 5px;">
            <p style="margin: 0; text-align: center;">
              &copy; 2026 UniCore Platform. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `
UniCore Transcript Verification

Student: ${studentData.studentName}
Email: ${studentData.studentEmail}
Semester: ${studentData.semester}
GPA: ${studentData.gpa}

Your Verification Code: ${code}

Code expires at: ${expirationTime}

Enter this code in the UniCore platform to verify the transcript.
      `
    };
  }

  /**
   * Request verification (send code to school)
   */
  static async requestVerification(transcriptId, schoolEmail, studentData) {
    try {
      const verificationCode = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const transcript = await Transcript.findByIdAndUpdate(
        transcriptId,
        {
          verificationCode,
          schoolEmailSent: schoolEmail,
          codeExpiresAt: expiresAt,
          verificationStatus: 'pending',
          verificationAttempts: 0
        },
        { new: true }
      );

      const emailContent = this.createEmailTemplate(verificationCode, {
        studentName: studentData.name,
        studentEmail: studentData.email,
        semester: transcript.semester,
        gpa: transcript.gpa,
        school: studentData.schoolName
      });

      const transporter = this.getEmailTransporter();
      
      // Only send email if transporter is configured
      if (transporter) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: schoolEmail,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        });
        console.log(`✅ Verification email sent to ${schoolEmail}`);
      } else {
        console.log(`⚠️  Email not sent (credentials not configured). Verification code: ${verificationCode}`);
      }

      await VerificationLog.create({
        transcript: transcriptId,
        schoolEmail,
        action: 'code_requested',
        notes: `Code sent to ${schoolEmail}`
      });

      return {
        success: true,
        message: `Verification code sent to ${schoolEmail}`,
        expiresAt,
        // Include code in response when email is not configured (dev mode only)
        ...(transporter ? {} : { verificationCode })
      };
    } catch (error) {
      throw new Error(`Failed to send verification: ${error.message}`);
    }
  }

  /**
   * Confirm verification code
   */
  static async confirmVerification(transcriptId, enteredCode, schoolEmail) {
    try {
      const transcript = await Transcript.findById(transcriptId);

      if (!transcript) {
        throw new Error('Transcript not found');
      }

      // Check if code has expired
      if (new Date() > transcript.codeExpiresAt) {
        await VerificationLog.create({
          transcript: transcriptId,
          schoolEmail,
          action: 'code_expired',
          notes: 'Code entered after expiration'
        });
        throw new Error('Verification code has expired. Request a new one.');
      }

      // Check if max attempts exceeded
      if (transcript.verificationAttempts >= transcript.maxAttempts) {
        await VerificationLog.create({
          transcript: transcriptId,
          schoolEmail,
          action: 'max_attempts_exceeded',
          notes: `Max attempts (${transcript.maxAttempts}) exceeded`
        });
        throw new Error('Maximum verification attempts exceeded. Please request a new code.');
      }

      // Verify code
      if (transcript.verificationCode !== enteredCode) {
        transcript.verificationAttempts += 1;
        await transcript.save();

        await VerificationLog.create({
          transcript: transcriptId,
          schoolEmail,
          action: 'code_entered',
          notes: `Incorrect code. Attempt ${transcript.verificationAttempts}/${transcript.maxAttempts}`
        });

        throw new Error(
          `Invalid code. ${transcript.maxAttempts - transcript.verificationAttempts} attempts remaining.`
        );
      }

      // Code is correct
      transcript.verificationStatus = 'verified';
      transcript.verifiedAt = new Date();
      transcript.verifiedBy = schoolEmail;
      transcript.verificationCode = null;
      await transcript.save();

      await VerificationLog.create({
        transcript: transcriptId,
        schoolEmail,
        action: 'verification_confirmed',
        notes: `Transcript verified successfully by ${schoolEmail}`
      });

      return {
        success: true,
        message: 'Transcript verified successfully!',
        transcript
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resend verification code
   */
  static async resendCode(transcriptId, schoolEmail) {
    try {
      const transcript = await Transcript.findById(transcriptId);

      if (!transcript) {
        throw new Error('Transcript not found');
      }

      const newCode = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      transcript.verificationCode = newCode;
      transcript.codeExpiresAt = expiresAt;
      transcript.verificationAttempts = 0;
      transcript.schoolEmailSent = schoolEmail;
      await transcript.save();

      const student = await Transcript.findById(transcriptId).populate('student');

      const emailContent = this.createEmailTemplate(newCode, {
        studentName: student.student.name,
        studentEmail: student.student.email,
        semester: transcript.semester,
        gpa: transcript.gpa
      });

      const transporter = this.getEmailTransporter();
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: schoolEmail,
        subject: emailContent.subject,
        html: emailContent.html
      });

      await VerificationLog.create({
        transcript: transcriptId,
        schoolEmail,
        action: 'code_requested',
        notes: 'Code resent (duplicate request)'
      });

      return {
        success: true,
        message: `New verification code sent to ${schoolEmail}`,
        expiresAt
      };
    } catch (error) {
      throw new Error(`Failed to resend code: ${error.message}`);
    }
  }

  /**
   * Get verification status
   */
  static async getVerificationStatus(transcriptId) {
    const transcript = await Transcript.findById(transcriptId);

    if (!transcript) {
      throw new Error('Transcript not found');
    }

    return {
      status: transcript.verificationStatus,
      schoolEmail: transcript.schoolEmailSent,
      attemptsRemaining: transcript.maxAttempts - transcript.verificationAttempts,
      expiresAt: transcript.codeExpiresAt,
      verifiedAt: transcript.verifiedAt,
      verifiedBy: transcript.verifiedBy
    };
  }
}

module.exports = TranscriptVerificationService;
