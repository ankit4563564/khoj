export const categories = [
  "Electronics",
  "ID cards",
  "Keys",
  "Bags",
  "Books & stationery",
  "Clothing",
  "Accessories",
  "Other",
] as const;
export const locations = [
  "RVU academic block",
  "Library",
  "Cafeteria",
  "Auditorium",
  "Sports ground",
  "Main gate",
  "Parking",
  "Other",
] as const;
export const departments = [
  "School of Computer Science & Engineering",
  "School of Business",
  "School of Economics",
  "School of Design & Innovation",
  "School of Liberal Arts & Sciences",
  "School of Law",
  "Other",
] as const;
export type Account = {
  id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  role: "student" | "staff";
  verified: boolean;
  collegeIdStatus: 'UNLINKED' | 'LINKED' | 'REQUIRES_REVIEW';
  collegeUsn: string | null;
  collegeIdLinkedAt: string | null;
};
export type ProtectedItem = {id:string;userId:string;name:string;category:string;brand:string;color:string;description:string;privateDetail:string;imageId:string|null;status:'safe'|'lost'|'returned';lostReportId:string|null;createdAt:string};
export type Activity = {id:string;type:string;title:string;location:string;reportId:string|null;createdAt:string};
export type Handover = {reportId:string;ownerId:string;finderId:string;ownerConfirmed:boolean;finderConfirmed:boolean;point:string;returnedAt:string|null;rewardStatus:'offered'|'skipped'|'sent_unverified';finderUpi:string;isOwner?:boolean;isFinder?:boolean};
export type Report = {
  id: string;
  userId: string;
  kind: "lost" | "found";
  title: string;
  category: string;
  color: string;
  brand: string;
  description: string;
  location: string;
  date: string;
  department: string;
  status: "open" | "in_custody" | "approved" | "returned" | "closed";
  imageId: string | null;
  createdAt: string;
  custodyLocation: string;
  privateDetail?: string;
  isMine?: boolean;
  reporterName?: string;
};
export type Claim = {
  id: string;
  reportId: string;
  userId: string;
  lostReportId: string | null;
  proof?: string;
  status: "pending" | "approved" | "rejected" | "returned";
  staffNote: string;
  createdAt: string;
  claimantName?: string;
  claimantEmail?: string;
  claimantStudentId?: string;
  reportTitle?: string;
};
export type Match = {
  id: string;
  lostId: string;
  foundId: string;
  score: number;
  createdAt: string;
  title: string;
  imageId: string | null;
  location: string;
};
export type Notice = {
  id: string;
  title: string;
  href: string;
  read: boolean;
  createdAt: string;
};
export type PortalData = {
  user: Account | null;
  reports: Report[];
  claims: Claim[];
  matches: Match[];
  notifications: Notice[];
  audit: {
    id: string;
    action: string;
    reportId: string;
    actorName: string;
    createdAt: string;
  }[];
  registeredItems: ProtectedItem[];
  activity: Activity[];
  pipeline: {found:number;matching:number;verification:number;returned:number};
  identityStats: {total:number;linked:number;pending:number};
  handovers: Handover[];
  foundIds: {reportId:string;location:string;status:string;createdAt:string}[];
  config: {
    google: boolean;
    vision: boolean;
    email: boolean;
    domains: string[];
  };
  stats: { lost: number; found: number; returned: number; custody: number };
};
