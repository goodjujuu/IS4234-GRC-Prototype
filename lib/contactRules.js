// M1 — Contact-Integrity Guard rules.
//
// At Wells Fargo, staff put placeholder emails and their own or branch contact
// details on customer accounts, so customers never received the notifications
// that would have revealed accounts opened in their name. These checks run on
// every staff-initiated change to a customer's mobile number or email.

// Fictional bank used throughout the demo. Staff email addresses use this domain.
export const STAFF_EMAIL_DOMAIN = 'northbridgebank.com';

export const COOLING_OFF_HOURS = 48;

const PLACEHOLDER_LOCAL_PARTS = new Set([
  'noemail', 'no-email', 'no.email', 'nomail', 'none', 'na', 'n.a', 'nil', 'null', 'test', 'testing',
  'dummy', 'fake', 'placeholder', 'customer', 'nobody', 'unknown', 'xxx', 'xx', 'abc', 'asdf', 'qwerty',
  '123', '1234', '12345', 'a', 'aa',
]);

const PLACEHOLDER_DOMAINS = new Set([
  'noemail.com', 'nomail.com', 'none.com', 'example.com', 'example.org', 'test.com', 'fake.com',
  'dummy.com', 'mailinator.com', 'email.com', 'abc.com', 'xxx.com',
]);

export function normaliseMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  // Accept "+65 9123 4567" as well as "9123 4567".
  return digits.length === 10 && digits.startsWith('65') ? digits.slice(2) : digits;
}

export function isValidMobile(digits) {
  return /^[89]\d{7}$/.test(digits); // Singapore mobile numbers
}

export function formatMobile(digits) {
  return digits ? `${digits.slice(0, 4)} ${digits.slice(4)}` : '';
}

export function maskMobile(digits) {
  return digits ? `•••• ${digits.slice(-4)}` : 'none on file';
}

export function maskEmail(email) {
  if (!email) return 'none on file';
  const [local, domain] = email.split('@');
  return `${local.charAt(0)}${'•'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
}

export function normaliseEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function fieldLabel(field) {
  return field === 'MOBILE' ? 'mobile number' : 'email address';
}

export function displayValue(field, value) {
  return field === 'MOBILE' ? formatMobile(value) : value;
}

// Returns one of:
//   { error }                       — the input is malformed (not a conduct issue; just fix the form)
//   { blockReason, normalised }     — the change breaks an M1 rule and is blocked + logged
//   { normalised }                  — the change may proceed to the cooling-off period
export async function checkContactChange(prisma, { account, field, value }) {
  if (field === 'MOBILE') {
    const normalised = normaliseMobile(value);
    if (!isValidMobile(normalised)) {
      return { error: 'Enter an 8-digit mobile number starting with 8 or 9.' };
    }
    if (normalised === account.mobile) {
      return { error: 'That is already the customer’s mobile number.' };
    }

    const staff = await prisma.banker.findFirst({ where: { mobile: normalised } });
    if (staff) {
      return {
        normalised,
        blockReason: `This number belongs to staff member ${staff.name}. Staff contact details can never be put on a customer account.`,
      };
    }

    const others = await prisma.account.count({ where: { mobile: normalised, NOT: { id: account.id } } });
    if (others > 0) {
      return {
        normalised,
        blockReason: `This number is already registered to ${others} other customer profile${others === 1 ? '' : 's'}.`,
      };
    }

    return { normalised };
  }

  if (field === 'EMAIL') {
    const normalised = normaliseEmail(value);
    if (!isValidEmail(normalised)) {
      return { error: 'Enter a valid email address.' };
    }
    if (normalised === account.email) {
      return { error: 'That is already the customer’s email address.' };
    }

    const [local, domain] = normalised.split('@');
    if (domain === STAFF_EMAIL_DOMAIN) {
      return {
        normalised,
        blockReason: 'This is a bank staff email address. Staff contact details can never be put on a customer account.',
      };
    }
    if (PLACEHOLDER_LOCAL_PARTS.has(local) || PLACEHOLDER_DOMAINS.has(domain)) {
      return {
        normalised,
        blockReason: 'This looks like a placeholder email, so the customer would never receive notifications.',
      };
    }

    const others = await prisma.account.count({ where: { email: normalised, NOT: { id: account.id } } });
    if (others > 0) {
      return {
        normalised,
        blockReason: `This email is already registered to ${others} other customer profile${others === 1 ? '' : 's'}.`,
      };
    }

    return { normalised };
  }

  return { error: 'field must be MOBILE or EMAIL.' };
}
