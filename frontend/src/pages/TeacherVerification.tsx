import { TeacherVerification } from "@/components/sektoradmin/TeacherVerification";

export default function TeacherVerificationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Müəllim Məlumatlarının Təsdiqi</h1>
        <p className="text-muted-foreground">
          Sektorunuza aid məktəblərin müəllim məlumatlarını yoxlayın və təsdiq edin
        </p>
      </div>
      <TeacherVerification />
    </div>
  );
}
