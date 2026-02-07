-- Migration 006: Seed all email templates
-- Inserts all 6 templates (4 existing + 2 new) with ON CONFLICT DO NOTHING
-- so existing customized templates are preserved.

INSERT INTO email_templates (name, subject, html_body, description)
VALUES (
  'user_invite',
  'You''re invited to {{org_name}} - Set Your Password',
  '<h2>Welcome to {{org_name}}!</h2>
<p>Hi {{user_name}},</p>
<p>You''ve been invited to join <strong>{{org_name}}</strong> on Feature Roadmap.</p>
<p>Click the button below to set your password and activate your account:</p>
<p><a href="{{invite_link}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Set Your Password</a></p>
<p style="color:#666;font-size:0.9em;">This link expires in 72 hours.</p>',
  'Sent when a user is invited to join an organization. Variables: {{org_name}}, {{invite_link}}, {{user_name}}'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, html_body, description)
VALUES (
  'password_reset',
  'Reset Your Password - Feature Roadmap',
  '<h2>Password Reset</h2>
<p>You requested a password reset. Click the link below to set a new password:</p>
<p><a href="{{reset_link}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">Reset Password</a></p>
<p>This link expires in 1 hour.</p>
<p style="color:#666;font-size:0.9em;">If you didn''t request this, you can safely ignore this email.</p>',
  'Sent when a user requests a password reset. Variables: {{reset_link}}'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, html_body, description)
VALUES (
  'organization_deactivation',
  'Your organization has been deactivated',
  '<h2>Organization Deactivated</h2>
<p>Your organization <strong>{{org_name}}</strong> has been deactivated by the platform administrator.</p>
<p>Users in your organization will no longer be able to access the platform until the account is reactivated.</p>
<p>If you believe this was done in error, please contact support.</p>',
  'Sent to org admins when their organization is deactivated. Variables: {{org_name}}'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, html_body, description)
VALUES (
  'subscription_cancellation',
  'Your {{plan_name}} subscription has been canceled',
  '<h2>Subscription Canceled</h2>
<p>Your organization <strong>{{org_name}}</strong>''s <strong>{{plan_name}}</strong> plan has been canceled by the platform administrator.</p>
<p>You will continue to have access until <strong>{{end_date}}</strong> ({{days_remaining}} days remaining).</p>
<p>After that date, your account will revert to the free plan.</p>',
  'Sent to org admins when their subscription is canceled. Variables: {{org_name}}, {{plan_name}}, {{days_remaining}}, {{end_date}}'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, html_body, description)
VALUES (
  'new_suggestion',
  'New suggestion submitted: {{suggestion_title}}',
  '<h2>New Suggestion</h2>
<p>A new suggestion has been submitted in <strong>{{org_name}}</strong>:</p>
<div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
  <h3 style="margin:0 0 8px;">{{suggestion_title}}</h3>
  <p style="margin:0;color:#555;">{{suggestion_description}}</p>
</div>
<p><strong>Submitted by:</strong> {{submitter_name}}</p>
<p><a href="{{board_link}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View on Board</a></p>',
  'Sent to org admins when a new suggestion is created. Variables: {{org_name}}, {{suggestion_title}}, {{suggestion_description}}, {{submitter_name}}, {{board_link}}'
)
ON CONFLICT (name) DO NOTHING;

INSERT INTO email_templates (name, subject, html_body, description)
VALUES (
  'new_comment',
  'New comment on: {{suggestion_title}}',
  '<h2>New Comment</h2>
<p>A new comment was posted on a suggestion in <strong>{{org_name}}</strong>:</p>
<p><strong>Suggestion:</strong> {{suggestion_title}}</p>
<div style="background:#f5f5f5;padding:16px;border-radius:8px;margin:16px 0;">
  <p style="margin:0;"><strong>{{commenter_name}}</strong> commented:</p>
  <p style="margin:8px 0 0;color:#555;">{{comment_content}}</p>
</div>
<p><a href="{{board_link}}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">View on Board</a></p>',
  'Sent to suggestion creator and org admins when a new comment is posted. Variables: {{org_name}}, {{suggestion_title}}, {{commenter_name}}, {{comment_content}}, {{board_link}}'
)
ON CONFLICT (name) DO NOTHING;
