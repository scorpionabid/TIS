import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

interface TeacherProfileUpdateData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  school: string;
  experienceYears: number;
  qualifications: string[];
  bio?: string;
  specialization?: string;
  address?: string;
}

interface TeacherProfileValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  data?: TeacherProfileUpdateData;
}

// Validation functions
const validateName = (name: string): string | null => {
  if (!name || name.trim().length < 2) {
    return 'Ad mütləbdir və ən az 2 simvol olmalıdır';
  }
  if (name.length > 100) {
    return 'Ad 100 simvoldan çox ola bilməz';
  }
  if (!/^[a-zA-ZəəıışöüçğƏƏİŞÖÜÇĞ\s]+$/.test(name)) {
    return 'Ad yalnız hərflərdən ibarət olmalıdır';
  }
  return null;
};

const validateEmail = (email: string): string | null => {
  if (!email || email.trim().length === 0) {
    return 'Email mütləbdir';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Email düzgün formatda olmalıdır';
  }
  if (email.length > 255) {
    return 'Email 255 simvoldan çox ola bilməz';
  }
  return null;
};

const validatePhone = (phone?: string): string | null => {
  if (!phone) return null; // Phone is optional
  
  const phoneRegex = /^\+994\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
  if (!phoneRegex.test(phone)) {
    return 'Telefon formatı düzgün deyil (+994 XX XXX XX XX)';
  }
  return null;
};

const validateSubject = (subject: string): string | null => {
  if (!subject || subject.trim().length < 2) {
    return 'İxtisas mütləbdir';
  }
  if (subject.length > 100) {
    return 'İxtisas 100 simvoldan çox ola bilməz';
  }
  return null;
};

const validateSchool = (school: string): string | null => {
  if (!school || school.trim().length < 2) {
    return 'Məktəb mütləbdir';
  }
  if (school.length > 200) {
    return 'Məktəb adı 200 simvoldan çox ola bilməz';
  }
  return null;
};

const validateExperience = (years: number): string | null => {
  if (isNaN(years) || !Number.isInteger(years)) {
    return 'Təcrübə müddəti tam rəqəm olmalıdır';
  }
  if (years < 0) {
    return 'Təcrübə müddəti 0-dan az ola bilməz';
  }
  if (years > 50) {
    return 'Təcrübə müddəti 50 ildən çox ola bilməz';
  }
  return null;
};

const validateQualifications = (qualifications: string[]): string | null => {
  if (!qualifications || qualifications.length === 0) {
    return 'Ən az bir bacarıq mütləbdir';
  }
  if (qualifications.length > 20) {
    return '20-dən çox bacarıq əlavə edə bilməz';
  }
  
  for (let i = 0; i < qualifications.length; i++) {
    if (qualifications[i].trim().length < 2) {
      return `Bacarıq ${i + 1} ən az 2 simvol olmalıdır`;
    }
  }
  
  return null;
};

const validateBio = (bio?: string): string | null => {
  if (!bio) return null; // Bio is optional
  if (bio.length > 1000) {
    return 'Bio 1000 simvoldan çox ola bilməz';
  }
  return null;
};

const validateSpecialization = (specialization?: string): string | null => {
  if (!specialization) return null; // Specialization is optional
  if (specialization.length > 100) {
    return 'İxtisaslaşma 100 simvoldan çox ola bilməz';
  }
  return null;
};

const validateAddress = (address?: string): string | null => {
  if (!address) return null; // Address is optional
  if (address.length > 500) {
    return 'Ünvan 500 simvoldan çox ola bilməz';
  }
  return null;
};

export const useTeacherProfileForm = (initialData: TeacherProfileUpdateData) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const form = useForm<TeacherProfileUpdateData>({
    defaultValues: initialData,
    mode: 'onChange'
  });

  // Real-time validation
  const validateField = (fieldName: string, value: any): string | null => {
    switch (fieldName) {
      case 'name':
        return validateName(value);
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'subject':
        return validateSubject(value);
      case 'school':
        return validateSchool(value);
      case 'experienceYears':
        return validateExperience(value);
      case 'qualifications':
        return validateQualifications(value);
      case 'bio':
        return validateBio(value);
      case 'specialization':
        return validateSpecialization(value);
      case 'address':
        return validateAddress(value);
      default:
        return null;
    }
  };

  // Validate entire form
  const validateForm = (data: TeacherProfileUpdateData): TeacherProfileValidationResult => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Validate each field
    const fields = [
      { name: 'name', value: data.name, validator: validateName as (val: any) => string | null },
      { name: 'email', value: data.email, validator: validateEmail as (val: any) => string | null },
      { name: 'phone', value: data.phone, validator: validatePhone as (val: any) => string | null },
      { name: 'subject', value: data.subject, validator: validateSubject as (val: any) => string | null },
      { name: 'school', value: data.school, validator: validateSchool as (val: any) => string | null },
      { name: 'experienceYears', value: data.experienceYears, validator: validateExperience as (val: any) => string | null },
      { name: 'qualifications', value: data.qualifications, validator: validateQualifications as (val: any) => string | null },
      { name: 'bio', value: data.bio, validator: validateBio as (val: any) => string | null },
      { name: 'specialization', value: data.specialization, validator: validateSpecialization as (val: any) => string | null },
      { name: 'address', value: data.address, validator: validateAddress as (val: any) => string | null }
    ];

    for (const field of fields) {
      const error = field.validator(field.value);
      if (error) {
        errors[field.name] = error;
        isValid = false;
      }
    }

    return {
      isValid,
      errors,
      data
    };
  };

  // Phone number formatter
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Check if it's a valid Azerbaijan number
    if (digits.startsWith('994') && digits.length === 12) {
      return `+994 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
    }
    
    // Return original if not valid
    return value;
  };

  // Phone number parser
  const parsePhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    return digits;
  };

  // Name formatter
  const formatName = (value: string): string => {
    return value
      .trim()
      .split(' ')
      .map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join(' ');
  };

  // Email formatter
  const formatEmail = (value: string): string => {
    return value.trim().toLowerCase();
  };

  // School formatter
  const formatSchool = (value: string): string => {
    return value.trim();
  };

  // Bio formatter
  const formatBio = (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  };

  // Address formatter
  const formatAddress = (value: string): string => {
    return value.trim().replace(/\s+/g, ' ');
  };

  // Submit handler
  const onSubmit = async (data: TeacherProfileUpdateData, submitFunction: (data: TeacherProfileUpdateData) => Promise<void>) => {
    setIsSubmitting(true);
    setValidationErrors({});

    try {
      // Format data before validation
      const formattedData = {
        ...data,
        name: formatName(data.name),
        email: formatEmail(data.email),
        phone: data.phone ? formatPhoneNumber(data.phone) : undefined,
        school: formatSchool(data.school),
        bio: data.bio ? formatBio(data.bio) : undefined,
        address: data.address ? formatAddress(data.address) : undefined
      };

      // Validate formatted data
      const validation = validateForm(formattedData);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        
        // Show toast for first error
        const firstError = Object.values(validation.errors)[0];
        toast({
          title: "Validation Xətası",
          description: firstError,
          variant: "destructive"
        });
        
        return;
      }

      // Submit data
      await submitFunction(formattedData);
      
      toast({
        title: "Uğur",
        description: "Profil məlumatlarınız uğurla saxlanıldı",
      });
      
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      toast({
        title: "Xəta",
        description: error.message || "Profil saxlanarkən xəta baş verdi",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    form.reset(initialData);
    setValidationErrors({});
    setIsSubmitting(false);
  };

  // Get field error
  const getFieldError = (fieldName: string): string | undefined => {
    return form.formState.errors[fieldName]?.message || validationErrors[fieldName];
  };

  // Check if field has error
  const hasFieldError = (fieldName: string): boolean => {
    return !!getFieldError(fieldName);
  };

  // Get field helper text
  const getFieldHelperText = (fieldName: string): string | undefined => {
    const error = getFieldError(fieldName);
    if (error) return error;
    
    // Return helper text for specific fields
    switch (fieldName) {
      case 'phone':
        return 'Format: +994 XX XXX XX XX';
      case 'name':
        return 'Ad və soyadınızı daxil edin';
      case 'email':
        return 'example@domain.az';
      case 'experienceYears':
        return 'İllərlə';
      case 'bio':
        return 'Özünüz haqqında qısa məlumat';
      case 'address':
        return 'Tam ünvanınız';
      default:
        return undefined;
    }
  };

  return {
    form,
    isSubmitting,
    validationErrors,
    validateField,
    validateForm,
    formatPhoneNumber,
    parsePhoneNumber,
    formatName,
    formatEmail,
    formatSchool,
    formatBio,
    formatAddress,
    onSubmit,
    resetForm,
    getFieldError,
    hasFieldError,
    getFieldHelperText
  };
};

// Utility functions for validation
export const teacherProfileValidationUtils = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidPhone: (phone: string): boolean => {
    const phoneRegex = /^\+994\s\d{2}\s\d{3}\s\d{2}\s\d{2}$/;
    return phoneRegex.test(phone);
  },
  
  isValidName: (name: string): boolean => {
    const nameRegex = /^[a-zA-ZəəıışöüçğƏƏİŞÖÜÇĞ\s]+$/;
    return nameRegex.test(name) && name.length >= 2 && name.length <= 100;
  },
  
  isValidExperience: (years: number): boolean => {
    return Number.isInteger(years) && years >= 0 && years <= 50;
  },
  
  isValidQualification: (qualification: string): boolean => {
    return qualification.trim().length >= 2;
  },
  
  sanitizeInput: (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
  }
};

export default useTeacherProfileForm;
