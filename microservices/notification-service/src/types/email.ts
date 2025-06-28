import { IEmailLocals } from "@muhamed-mustafa/jobber-shared";

export type EmailTemplateName =
  | 'forgotPassword'
  | 'offer'
  | 'orderDeferred'
  | 'orderExtension'
  | 'orderExtensionApproval'
  | 'orderPlaced'
  | 'orderReceipt'
  | 'orgEmail'
  | 'resetPasswordSuccess'
  | 'verifyEmail';

export interface EmailTemplateParams {
  template: EmailTemplateName;
  receiver: string;
  locals: IEmailLocals;
}
