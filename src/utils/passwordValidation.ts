export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  noWhitespace: boolean;
}

export interface PasswordAnalysis {
  reqs: PasswordRequirements;
  metCount: number;
  strengthLabel: 'Weak' | 'Medium' | 'Strong';
  isAllValid: boolean;
}

export const checkPasswordRequirements = (password: string): PasswordAnalysis => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const noWhitespace = !/\s/.test(password);

  const reqs: PasswordRequirements = {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    noWhitespace
  };

  const metCount = Object.values(reqs).filter(Boolean).length;

  let strengthLabel: 'Weak' | 'Medium' | 'Strong' = 'Weak';
  if (metCount === 6) {
    strengthLabel = 'Strong';
  } else if (metCount >= 4 && minLength && noWhitespace) {
    strengthLabel = 'Medium';
  } else {
    strengthLabel = 'Weak';
  }

  return {
    reqs,
    metCount,
    strengthLabel,
    isAllValid: metCount === 6
  };
};

export const getPasswordValidationError = (password: string): string | null => {
  if (!password) {
    return 'Password is required.';
  }

  const { reqs } = checkPasswordRequirements(password);

  if (!reqs.noWhitespace) {
    return 'Password cannot contain blank spaces.';
  }

  if (!reqs.minLength) {
    return 'Password must be at least 8 characters long.';
  }

  const missingCount = [
    !reqs.hasUppercase,
    !reqs.hasLowercase,
    !reqs.hasNumber,
    !reqs.hasSpecial
  ].filter(Boolean).length;

  if (missingCount >= 3) {
    return 'Your password is weak. Add uppercase and lowercase letters, a number, and a special character.';
  }

  if (!reqs.hasUppercase) {
    return 'Add at least one uppercase letter.';
  }
  if (!reqs.hasLowercase) {
    return 'Add at least one lowercase letter.';
  }
  if (!reqs.hasNumber) {
    return 'Add at least one number.';
  }
  if (!reqs.hasSpecial) {
    return 'Add at least one special character.';
  }

  return null;
};
