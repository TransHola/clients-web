/**
 * TRANSHOLA Client Platform - Core Domain Types
 * Defines the comprehensive Schema and RBAC rules mapping across all three Client identities.
 */

// ----------------------------------------------------
// 1. CORE CATEGORIES & STATUS
// ----------------------------------------------------
export type ClientCategory = 'INDIVIDUAL' | 'ENTITY' | 'GOVERNMENT';

export type ProfileStatus = 
  | 'PENDING_VERIFICATION' // B2B/Gov pending Super Admin KYC
  | 'ACTIVE'               // Fully operational
  | 'SUSPENDED'            // SLA violation, payment failure
  | 'CLOSED';

// ----------------------------------------------------
// 2. PROFILE SCHEMAS (Database Entites)
// ----------------------------------------------------

export interface BaseClientProfile {
  id: string;
  category: ClientCategory;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Standard B2C Profile
 * Minimum friction, direct payment methods.
 */
export interface IndividualProfile extends BaseClientProfile {
  category: 'INDIVIDUAL';
  firstName: string;
  lastName: string;
  email: string; // Primary Auth Email
  phone: string;
  preferences: {
    accessibilityRequired: boolean;
    defaultVehicleType?: string;
    savedLocations: string[];
  };
}

/**
 * Enterprise B2B Profile
 * Requires Super Admin KYC validation. Supports multi-user hierarchy.
 */
export interface EntityProfile extends BaseClientProfile {
  category: 'ENTITY';
  entityName: string;
  entityType: 'COMPANY' | 'SCHOOL' | 'ORGANIZATION' | 'OTHER';
  registrationNumber: string; // Commercial Registration
  taxId?: string;             // VAT/Tax Number
  domainName: string;         // Enforces auth domain rules (e.g. @acme.com)
  billingEmail: string;       // Centralized invoicing
  hqAddress: string;
  settings: {
    requirePO: boolean;
    allowInvites: boolean;
    billingMethod: 'CENTRALIZED_INVOICE' | 'USER_PAID';
  };
}

/**
 * Government B2G Profile
 * Maximum compliance, strict PO invoicing, custom tax exemptions.
 */
export interface GovernmentProfile extends BaseClientProfile {
  category: 'GOVERNMENT';
  agencyName: string;
  departmentName?: string;
  governmentId: string;       // Verification ID
  billingEmail: string;
  complianceLevel: 'STANDARD' | 'HIGH_SECURITY';
  settings: {
    requirePO: boolean;       // Usually true for Gov
    requiresApprovalChain: boolean; // Dispatch cannot proceed without Gov Approver
    allowedCategories: string[];    // Restricted vehicle types
  };
}

// Union Type representing any Client Profile
export type ClientProfile = IndividualProfile | EntityProfile | GovernmentProfile;


// ----------------------------------------------------
// 3. MULTI-USER RBAC & HIERARCHY (Entity & Gov)
// ----------------------------------------------------

export type ClientRole = 
  | 'ORG_ADMIN'      // Full control over the profile, billing, and user invites
  | 'BOOKER'         // Can book rides for themselves and others
  | 'VIEWER'         // Read-only access to invoices and trip logs
  | 'PASSENGER';     // Can only ride (cannot book via corporate account directly)

export interface ClientUser {
  id: string;
  profileId: string;       // Foreign Key to ClientProfile.id
  email: string;
  fullName: string;
  role: ClientRole;
  departmentId?: string;   // For Cost-Center reporting
  status: 'ACTIVE' | 'INVITED' | 'DISABLED';
  lastActive: string;
}
