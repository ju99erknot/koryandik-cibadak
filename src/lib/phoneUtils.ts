/**
 * Format Indonesian phone number for WhatsApp link
 * Converts local format (08xx) to international format (628xx)
 * 
 * @param phone - Phone number in any format (085794055571, +6285794055571, 6285794055571)
 * @returns Formatted phone number for WhatsApp API (without + prefix)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with 62 (Indonesia country code)
  if (cleanPhone.startsWith('0')) {
    return '62' + cleanPhone.substring(1);
  }
  
  // If starts with 62, return as is
  if (cleanPhone.startsWith('62')) {
    return cleanPhone;
  }
  
  // If already international format without +, return as is
  return cleanPhone;
}

/**
 * Format phone number for display
 * Formats Indonesian phone number in readable format
 * 
 * @param phone - Phone number in any format
 * @returns Formatted phone number for display (e.g., 0857-9405-5571)
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) return phone;
  
  // Format: 0857-9405-5571 or 62857-9405-5571
  if (cleanPhone.startsWith('0')) {
    return cleanPhone.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  
  if (cleanPhone.startsWith('62')) {
    return cleanPhone.replace(/(\d{2})(\d{3})(\d{4})(\d{4})/, '$1-$2-$3-$4');
  }
  
  return phone;
}

/**
 * Validate Indonesian phone number
 * 
 * @param phone - Phone number to validate
 * @returns true if valid Indonesian phone number
 */
export function isValidIndonesianPhone(phone: string): boolean {
  if (!phone) return false;
  
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Indonesian mobile numbers: 10-13 digits, starting with 08 or 628
  const mobilePattern = /^(08\d{8,11}|628\d{8,11})$/;
  
  return mobilePattern.test(cleanPhone);
}
