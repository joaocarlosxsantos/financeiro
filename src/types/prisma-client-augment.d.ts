// Temporary local augmentation to satisfy TypeScript in this workspace
// After running `npx prisma generate` locally this is optional and can be removed.
declare module '@prisma/client' {
  export class PrismaClient {
    // basic model accessors used by the controle-contas APIs
    group: any;
    member: any;
    bill: any;
    billMemberShare: any;
    [key: string]: any;
    constructor();
  }
}
