import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GraduationCapIcon, Plus, Edit, Eye, BookOpen, Clock, Users, Calculator } from "lucide-react";

export default function SchoolWorkload() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dərs Yükü İdarəetməsi</h1>
          <p className="text-muted-foreground">Müəllimlərin dərs yükü və fənn təqsimati</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Yeni Dərs Yükü
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktiv müəllimlər</p>
                <p className="text-2xl font-bold">45</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ümumi dərs saatı</p>
                <p className="text-2xl font-bold">1,340</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fənnlər</p>
                <p className="text-2xl font-bold">18</p>
              </div>
              <BookOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orta yük</p>
                <p className="text-2xl font-bold">18.5</p>
                <p className="text-xs text-muted-foreground">saat/həftə</p>
              </div>
              <Calculator className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrləmə</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Sinif seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün siniflər</SelectItem>
                <SelectItem value="1">1-ci sinif</SelectItem>
                <SelectItem value="2">2-ci sinif</SelectItem>
                <SelectItem value="3">3-cü sinif</SelectItem>
                <SelectItem value="4">4-cü sinif</SelectItem>
                <SelectItem value="5">5-ci sinif</SelectItem>
                <SelectItem value="6">6-cı sinif</SelectItem>
                <SelectItem value="7">7-ci sinif</SelectItem>
                <SelectItem value="8">8-ci sinif</SelectItem>
                <SelectItem value="9">9-cu sinif</SelectItem>
                <SelectItem value="10">10-cu sinif</SelectItem>
                <SelectItem value="11">11-ci sinif</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Fənn seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün fənnlər</SelectItem>
                <SelectItem value="math">Riyaziyyat</SelectItem>
                <SelectItem value="physics">Fizika</SelectItem>
                <SelectItem value="chemistry">Kimya</SelectItem>
                <SelectItem value="biology">Biologiya</SelectItem>
                <SelectItem value="azerbaijani">Azərbaycan dili</SelectItem>
                <SelectItem value="literature">Ədəbiyyat</SelectItem>
                <SelectItem value="history">Tarix</SelectItem>
                <SelectItem value="geography">Coğrafiya</SelectItem>
                <SelectItem value="english">İngilis dili</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Müəllim seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün müəllimlər</SelectItem>
                <SelectItem value="teacher1">Əli Məmmədov</SelectItem>
                <SelectItem value="teacher2">Leyla Həsənova</SelectItem>
                <SelectItem value="teacher3">Rəşad Əliyev</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Axtarış..." />
          </div>
        </CardContent>
      </Card>

      {/* Teacher Workload List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCapIcon className="h-5 w-5" />
            Müəllim Dərs Yükləri
          </CardTitle>
          <CardDescription>Müəllimlərin fənn və sinif təqsimatı</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                teacher: "Əli Məmmədov",
                subject: "Riyaziyyat",
                classes: ["9A", "9B", "10A"],
                totalHours: 18,
                weeklyHours: 6,
                experience: "15 il"
              },
              {
                teacher: "Leyla Həsənova",
                subject: "Fizika",
                classes: ["10A", "10B", "11A"],
                totalHours: 15,
                weeklyHours: 5,
                experience: "12 il"
              },
              {
                teacher: "Rəşad Əliyev",
                subject: "Azərbaycan dili",
                classes: ["5A", "5B", "6A"],
                totalHours: 21,
                weeklyHours: 7,
                experience: "8 il"
              },
              {
                teacher: "Nigar Qarayeva",
                subject: "İngilis dili",
                classes: ["7A", "7B", "8A", "8B"],
                totalHours: 24,
                weeklyHours: 8,
                experience: "10 il"
              },
              {
                teacher: "Tural Həsənov",
                subject: "Tarix",
                classes: ["9A", "9B"],
                totalHours: 12,
                weeklyHours: 4,
                experience: "20 il"
              }
            ].map((workload, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-surface/50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-medium text-foreground">{workload.teacher}</h3>
                    <Badge variant="outline">{workload.subject}</Badge>
                    <Badge variant="secondary">{workload.experience}</Badge>
                  </div>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground mb-2">
                    <span>Siniflər: {workload.classes.join(", ")}</span>
                    <span>Həftəlik: {workload.weeklyHours} saat</span>
                    <span>Ümumi: {workload.totalHours} saat</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        workload.totalHours > 20 ? 'bg-orange-500' :
                        workload.totalHours > 15 ? 'bg-primary' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((workload.totalHours / 25) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subject Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fənn üzrə Dərs Yükü</CardTitle>
            <CardDescription>Hər fənn üzrə həftəlik saat sayı</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { subject: "Riyaziyyat", hours: 45, color: "bg-blue-500" },
                { subject: "Azərbaycan dili", hours: 42, color: "bg-green-500" },
                { subject: "İngilis dili", hours: 38, color: "bg-purple-500" },
                { subject: "Fizika", hours: 35, color: "bg-orange-500" },
                { subject: "Tarix", hours: 30, color: "bg-red-500" },
                { subject: "Biologiya", hours: 28, color: "bg-teal-500" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.subject}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${(item.hours / 50) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground w-12">{item.hours}s</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sinif üzrə Dərs Yükü</CardTitle>
            <CardDescription>Hər sinif üzrə həftəlik ümumi saat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { grade: "11-ci sinif", hours: 35, students: 28 },
                { grade: "10-cu sinif", hours: 34, students: 32 },
                { grade: "9-cu sinif", hours: 33, students: 35 },
                { grade: "8-ci sinif", hours: 32, students: 38 },
                { grade: "7-ci sinif", hours: 31, students: 40 },
                { grade: "6-cı sinif", hours: 30, students: 42 }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded">
                  <div>
                    <span className="text-sm font-medium">{item.grade}</span>
                    <p className="text-xs text-muted-foreground">{item.students} şagird</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold">{item.hours}</span>
                    <p className="text-xs text-muted-foreground">saat/həftə</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}