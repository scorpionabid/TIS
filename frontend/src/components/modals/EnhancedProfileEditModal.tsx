// Re-export the new modular profile edit modal
export { default } from '../profile/ProfileEditModal';

// Keep the old interface for backward compatibility
interface EnhancedProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileData: ProfileResponse | null;
  onProfileUpdate: (updatedProfile: ProfileResponse) => void;
}

interface EnhancedProfileFormData {
  // Basic information
  first_name: string;
  last_name: string;
  patronymic: string;
  contact_phone: string;
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  national_id: string;
  utis_code: string;
  address: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
  };
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_email: string;
  
  // Professional teacher fields
  subjects: number[];
  specialty: string;
  experience_years: number;
  miq_score: number;
  certification_score: number;
  last_certification_date: string;
  qualifications: string[];
  training_courses: string[];
  degree_level: string;
  graduation_university: string;
  graduation_year: number;
  university_gpa: number;
  
  // Student academic fields
  student_miq_score: number;
  academic_achievements: string[];
  extracurricular_activities: string[];
  health_info: any;
  previous_school: string;
  parent_occupation: any;
  family_income: number;
  special_needs: string[];
  notes: string;
}

export const EnhancedProfileEditModal: React.FC<EnhancedProfileEditModalProps> = ({
  isOpen,
  onClose,
  profileData,
  onProfileUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const { toast } = useToast();

  // Load subjects for teacher fields
  const { data: subjects } = useQuery({
    queryKey: subjectKeys.options(),
    queryFn: () => subjectService.getSubjectOptions(),
    enabled: isOpen,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<EnhancedProfileFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      patronymic: '',
      contact_phone: '',
      birth_date: '',
      gender: 'other',
      national_id: '',
      utis_code: '',
      address: {
        street: '',
        city: '',
        postal_code: '',
        country: 'Azerbaijan'
      },
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_email: '',
      // Professional fields
      subjects: [],
      specialty: '',
      experience_years: 0,
      miq_score: 0,
      certification_score: 0,
      last_certification_date: '',
      qualifications: [],
      training_courses: [],
      degree_level: '',
      graduation_university: '',
      graduation_year: 0,
      university_gpa: 0,
      // Student fields
      student_miq_score: 0,
      academic_achievements: [],
      extracurricular_activities: [],
      health_info: {},
      previous_school: '',
      parent_occupation: {},
      family_income: 0,
      special_needs: [],
      notes: ''
    }
  });

  // Load profile data when modal opens
  useEffect(() => {
    if (isOpen && !profileData) {
      const loadProfile = async () => {
        try {
          setIsLoading(true);
          const profile = await profileService.getProfile();
          onProfileUpdate(profile);
        } catch (error) {
          console.error('Profile loading error:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadProfile();
    }
    
    if (profileData?.user?.profile) {
      const profile = profileData.user.profile;
      reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        patronymic: profile.patronymic || '',
        contact_phone: profile.contact_phone || '',
        birth_date: profile.birth_date || '',
        gender: profile.gender || 'other',
        national_id: profile.national_id || '',
        utis_code: profile.utis_code || '',
        address: {
          street: profile.address?.street || '',
          city: profile.address?.city || '',
          postal_code: profile.address?.postal_code || '',
          country: profile.address?.country || 'Azerbaijan'
        },
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        emergency_contact_email: profile.emergency_contact_email || '',
        // Professional fields
        subjects: profile.subjects || [],
        specialty: profile.specialty || '',
        experience_years: profile.experience_years || 0,
        miq_score: profile.miq_score || 0,
        certification_score: profile.certification_score || 0,
        last_certification_date: profile.last_certification_date || '',
        qualifications: profile.qualifications || [],
        training_courses: profile.training_courses || [],
        degree_level: profile.degree_level || '',
        graduation_university: profile.graduation_university || '',
        graduation_year: profile.graduation_year || 0,
        university_gpa: profile.university_gpa || 0,
        // Student fields
        student_miq_score: profile.student_miq_score || 0,
        academic_achievements: profile.academic_achievements || [],
        extracurricular_activities: profile.extracurricular_activities || [],
        health_info: profile.health_info || {},
        previous_school: profile.previous_school || '',
        parent_occupation: profile.parent_occupation || {},
        family_income: profile.family_income || 0,
        special_needs: profile.special_needs || [],
        notes: profile.notes || ''
      });
      setAvatarPreview(profileData.avatar_url || null);
    }
  }, [isOpen, profileData, reset, onProfileUpdate]);

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Xəta',
        description: 'Şəkil ölçüsü maksimum 5MB ola bilər',
        variant: 'destructive',
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Xəta',
        description: 'Yalnız şəkil faylları qəbul edilir',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploadingAvatar(true);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const response = await profileService.uploadAvatar(file);
      
      toast({
        title: 'Uğurlu',
        description: 'Avatar yeniləndi',
      });
      
      const updatedProfile = await profileService.getProfile();
      onProfileUpdate(updatedProfile);
      setAvatarPreview(updatedProfile.avatar_url || null);
      
    } catch (error) {
      console.error('Avatar yüklənərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: 'Avatar yüklənə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true);
      await profileService.removeAvatar();
      setAvatarPreview(null);
      
      toast({
        title: 'Uğurlu',
        description: 'Avatar silindi',
      });
      
      const updatedProfile = await profileService.getProfile();
      onProfileUpdate(updatedProfile);
      
    } catch (error) {
      console.error('Avatar silinərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: 'Avatar silinə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: EnhancedProfileFormData) => {
    try {
      setIsLoading(true);
      
      // Prepare profile data for submission
      const profileData = {
        first_name: data.first_name,
        last_name: data.last_name,
        patronymic: data.patronymic,
        contact_phone: data.contact_phone,
        birth_date: data.birth_date,
        gender: data.gender,
        national_id: data.national_id,
        address: data.address,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_email: data.emergency_contact_email,
        // Professional fields
        subjects: data.subjects,
        specialty: data.specialty,
        experience_years: data.experience_years,
        miq_score: data.miq_score,
        certification_score: data.certification_score,
        last_certification_date: data.last_certification_date,
        qualifications: data.qualifications,
        training_courses: data.training_courses,
        degree_level: data.degree_level,
        graduation_university: data.graduation_university,
        graduation_year: data.graduation_year,
        university_gpa: data.university_gpa,
        // Student fields
        student_miq_score: data.student_miq_score,
        academic_achievements: data.academic_achievements,
        extracurricular_activities: data.extracurricular_activities,
        health_info: data.health_info,
        previous_school: data.previous_school,
        parent_occupation: data.parent_occupation,
        family_income: data.family_income,
        special_needs: data.special_needs,
        notes: data.notes
      };

      const updateData: ProfileUpdateData = {
        profile: profileData
      };

      const updatedProfile = await profileService.updateProfile(updateData);
      
      toast({
        title: 'Uğurlu',
        description: 'Profil məlumatları yeniləndi',
      });
      
      onProfileUpdate(updatedProfile);
      onClose();
      
    } catch (error: any) {
      console.error('Profil yenilənərkən xəta:', error);
      toast({
        title: 'Xəta',
        description: error.message || 'Profil yenilənə bilmədi. Yenidən cəhd edin.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty && !isLoading) {
      if (confirm('Saxlanmamış dəyişikliklər var. Pəncərəni bağlamaq istədiyinizdən əminsiniz?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!profileData) {
    if (!isOpen) return null;
    
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Profil məlumatları yüklənir...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const userRole = typeof profileData.user.role === 'object' && profileData.user.role 
    ? profileData.user.role.name 
    : String(profileData.user.role || '');
    
  const isTeacher = userRole.toLowerCase().includes('teacher') || userRole.toLowerCase().includes('müəllim');
  const isStudent = userRole.toLowerCase().includes('student') || userRole.toLowerCase().includes('şagird');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Profil Məlumatlarını Redaktə Et</span>
            {profileData.user.profile?.utis_code && (
              <Badge variant="outline">
                UTIS: {profileData.user.profile.utis_code}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Şəxsi və peşə məlumatlarınızı yeniləyin.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              <User className="h-4 w-4 mr-2" />
              Əsas məlumatlar
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger value="professional">
                <GraduationCap className="h-4 w-4 mr-2" />
                Peşə məlumatları
              </TabsTrigger>
            )}
            {isStudent && (
              <TabsTrigger value="academic">
                <BookOpen className="h-4 w-4 mr-2" />
                Akademik məlumatlar
              </TabsTrigger>
            )}
            <TabsTrigger value="additional">
              <FileText className="h-4 w-4 mr-2" />
              Əlavə məlumatlar
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
            <TabsContent value="basic" className="space-y-6">
              {/* Avatar Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5" />
                    Profil şəkli
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <Avatar className="h-24 w-24">
                        {avatarPreview && <AvatarImage src={avatarPreview} alt="Avatar preview" />}
                        <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                          {profileService.getUserInitials(profileData.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {isUploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                          <Loader2 className="h-6 w-6 text-white animate-spin" />
                        </div>
                      )}
                      
                      {avatarPreview && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={handleRemoveAvatar}
                          disabled={isUploadingAvatar}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <label htmlFor="avatar-upload">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingAvatar}
                          className="cursor-pointer"
                          asChild
                        >
                          <span>
                            {isUploadingAvatar ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4 mr-2" />
                            )}
                            Avatar Yenilə
                          </span>
                        </Button>
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* User Info Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Hesab məlumatları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">E-poçt:</span>
                    <span className="text-sm">{profileData.user.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">İstifadəçi adı:</span>
                    <span className="text-sm">{profileData.user.username}</span>
                    <Badge variant="secondary" className="text-xs">
                      {typeof profileData.user.role === 'object' && profileData.user.role 
                        ? (profileData.user.role.display_name || profileData.user.role.name || 'Təyin edilməyib')
                        : String(profileData.user.role || 'Təyin edilməyib')
                      }
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Şəxsi məlumatlar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">Ad *</Label>
                      <Input
                        id="first_name"
                        {...register('first_name', { required: 'Ad daxil etmək mütləqdir' })}
                        placeholder="Adınızı daxil edin"
                      />
                      {errors.first_name && (
                        <p className="text-sm text-destructive">{errors.first_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="last_name">Soyad *</Label>
                      <Input
                        id="last_name"
                        {...register('last_name', { required: 'Soyad daxil etmək mütləqdir' })}
                        placeholder="Soyadınızı daxil edin"
                      />
                      {errors.last_name && (
                        <p className="text-sm text-destructive">{errors.last_name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="patronymic">Ata adı</Label>
                      <Input
                        id="patronymic"
                        {...register('patronymic')}
                        placeholder="Ata adınızı daxil edin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Cins</Label>
                      <Select 
                        value={watch('gender')} 
                        onValueChange={(value) => setValue('gender', value as 'male' | 'female' | 'other')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Cinsi seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Kişi</SelectItem>
                          <SelectItem value="female">Qadın</SelectItem>
                          <SelectItem value="other">Daxil etmək istəmirəm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Doğum tarixi</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        {...register('birth_date')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact_phone">Telefon</Label>
                      <Input
                        id="contact_phone"
                        {...register('contact_phone')}
                        placeholder="+994 XX XXX XX XX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="national_id">Şəxsiyyət vəsiqəsi</Label>
                      <Input
                        id="national_id"
                        {...register('national_id')}
                        placeholder="AZE1234567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="utis_code">UTIS Kodu</Label>
                      <Input
                        id="utis_code"
                        {...register('utis_code')}
                        placeholder="Avtomatik təyin edilir"
                        disabled
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Ünvan məlumatları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="address.street">Küçə ünvanı</Label>
                      <Textarea
                        id="address.street"
                        {...register('address.street')}
                        placeholder="Küçə ünvanınızı daxil edin"
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address.city">Şəhər</Label>
                      <Input
                        id="address.city"
                        {...register('address.city')}
                        placeholder="Şəhər adını daxil edin"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address.postal_code">Poçt kodu</Label>
                      <Input
                        id="address.postal_code"
                        {...register('address.postal_code')}
                        placeholder="Poçt kodunu daxil edin"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Təcili əlaqə məlumatları
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="emergency_contact_name">Təcili əlaqə şəxsi</Label>
                      <Input
                        id="emergency_contact_name"
                        {...register('emergency_contact_name')}
                        placeholder="Təcili hallarda əlaqə saxlanılacaq şəxsin adı"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Təcili əlaqə telefonu</Label>
                      <Input
                        id="emergency_contact_phone"
                        {...register('emergency_contact_phone')}
                        placeholder="+994 XX XXX XX XX"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_email">Təcili əlaqə e-poçtu</Label>
                      <Input
                        id="emergency_contact_email"
                        type="email"
                        {...register('emergency_contact_email')}
                        placeholder="emergency@example.com"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isTeacher && (
              <TabsContent value="professional" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Peşə məlumatları
                    </CardTitle>
                    <CardDescription>
                      Müəllim kimi peşə məlumatlarınızı daxil edin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="specialty">İxtisas</Label>
                        <Input
                          id="specialty"
                          {...register('specialty')}
                          placeholder="Məsələn: Riyaziyyat müəllimi"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="experience_years">İş təcrübəsi (il)</Label>
                        <Input
                          id="experience_years"
                          type="number"
                          min="0"
                          max="50"
                          {...register('experience_years', { valueAsNumber: true })}
                          placeholder="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="miq_score">MİQ balı</Label>
                        <Input
                          id="miq_score"
                          type="number"
                          min="0"
                          max="999.99"
                          step="0.01"
                          {...register('miq_score', { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="certification_score">Sertifikasiya balı</Label>
                        <Input
                          id="certification_score"
                          type="number"
                          min="0"
                          max="999.99"
                          step="0.01"
                          {...register('certification_score', { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="last_certification_date">Son sertifikasiya tarixi</Label>
                        <Input
                          id="last_certification_date"
                          type="date"
                          {...register('last_certification_date')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="degree_level">Təhsil səviyyəsi</Label>
                        <Select 
                          value={watch('degree_level')} 
                          onValueChange={(value) => setValue('degree_level', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Təhsil səviyyəsini seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="secondary">Orta təhsil</SelectItem>
                            <SelectItem value="vocational">Orta peşə təhsili</SelectItem>
                            <SelectItem value="bachelor">Bakalavr</SelectItem>
                            <SelectItem value="master">Magistr</SelectItem>
                            <SelectItem value="phd">Doktorantura</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="graduation_university">Bitirdiyi universitet</Label>
                        <Input
                          id="graduation_university"
                          {...register('graduation_university')}
                          placeholder="Universitet adı"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="graduation_year">Bitirmə ili</Label>
                        <Input
                          id="graduation_year"
                          type="number"
                          min="1950"
                          max={new Date().getFullYear()}
                          {...register('graduation_year', { valueAsNumber: true })}
                          placeholder="2020"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="university_gpa">Universitet GPA</Label>
                        <Input
                          id="university_gpa"
                          type="number"
                          min="0"
                          max="4.00"
                          step="0.01"
                          {...register('university_gpa', { valueAsNumber: true })}
                          placeholder="3.50"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {isStudent && (
              <TabsContent value="academic" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Akademik məlumatlar
                    </CardTitle>
                    <CardDescription>
                      Şagird kimi akademik məlumatlarınızı daxil edin.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="student_miq_score">Şagird MİQ balı</Label>
                        <Input
                          id="student_miq_score"
                          type="number"
                          min="0"
                          max="999.99"
                          step="0.01"
                          {...register('student_miq_score', { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="previous_school">Əvvəlki məktəb</Label>
                        <Input
                          id="previous_school"
                          {...register('previous_school')}
                          placeholder="Əvvəl oxuduğu təhsil müəssisəsi"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="family_income">Ailə gəliri (AZN)</Label>
                        <Input
                          id="family_income"
                          type="number"
                          min="0"
                          step="0.01"
                          {...register('family_income', { valueAsNumber: true })}
                          placeholder="500.00"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            <TabsContent value="additional" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Əlavə məlumatlar
                  </CardTitle>
                  <CardDescription>
                    Digər mühüm məlumatları daxil edin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Əlavə qeydlər</Label>
                      <Textarea
                        id="notes"
                        {...register('notes')}
                        placeholder="Digər mühüm məlumatlar"
                        rows={4}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Tabs>

        <DialogFooter className="flex space-x-2 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Ləğv et
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !isDirty}
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saxlanılır...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Dəyişiklikləri Saxla
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};