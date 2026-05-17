import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Folder, 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Eye,
  Edit,
  Trash2,
  Calendar,
  BookOpen,
  File,
  Image,
  Video,
  Music,
  Archive,
  Star
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface ResourceItem {
  id: string;
  name: string;
  type: 'document' | 'video' | 'audio' | 'image' | 'archive' | 'folder';
  category: string;
  subject: string;
  size: string;
  uploadDate: string;
  downloadCount: number;
  description?: string;
  tags: string[];
  isFavorite: boolean;
}

export default function TeacherResources() {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Mock data - real API-dən gələcək
  const { data: resourcesData, isLoading } = useQuery<ResourceItem[]>({
    queryKey: ['teacher-resources', currentUser?.id],
    queryFn: async () => {
      // Temporary mock data
      return [
        {
          id: '1',
          name: 'Riyaziyyat Dərsliyi 10-cu sinif',
          type: 'document',
          category: 'dərslik',
          subject: 'Riyaziyyat',
          size: '15.2 MB',
          uploadDate: '2023-06-15',
          downloadCount: 45,
          description: '10-cu sinif üçün riyaziyyat dərsliyi',
          tags: ['riyaziyyat', '10-cu sinif', 'dərslik'],
          isFavorite: true
        },
        {
          id: '2',
          name: 'Cəbr Məsələlər Toplusu',
          type: 'document',
          category: 'toplu',
          subject: 'Riyaziyyat',
          size: '8.7 MB',
          uploadDate: '2023-05-20',
          downloadCount: 32,
          description: 'Cəbr mövzusu üzrə məsələlər toplusu',
          tags: ['cəbr', 'məsələlər', 'toplu'],
          isFavorite: false
        },
        {
          id: '3',
          name: 'İnteraktiv Dərs Video',
          type: 'video',
          category: 'video',
          subject: 'Riyaziyyat',
          size: '125.4 MB',
          uploadDate: '2023-06-01',
          downloadCount: 28,
          description: 'İnteraktiv dərsin video yazısı',
          tags: ['video', 'interaktiv', 'dərs'],
          isFavorite: true
        },
        {
          id: '4',
          name: 'Fizika Laboratoriya Şablonu',
          type: 'document',
          category: 'şablon',
          subject: 'Fizika',
          size: '2.3 MB',
          uploadDate: '2023-04-10',
          downloadCount: 15,
          description: 'Laboratoriya işləri üçün şablon',
          tags: ['fizika', 'laboratoriya', 'şablon'],
          isFavorite: false
        },
        {
          id: '5',
          name: 'Tədris Planı 2023-2024',
          type: 'document',
          category: 'plan',
          subject: 'Ümumi',
          size: '1.8 MB',
          uploadDate: '2023-03-15',
          downloadCount: 67,
          description: 'İllik tədris planı',
          tags: ['plan', '2023-2024', 'tədris'],
          isFavorite: true
        }
      ];
    },
    enabled: !!currentUser?.id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Yüklənir...</span>
      </div>
    );
  }

  if (!resourcesData || resourcesData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Resurslar tapılmadı</h3>
          <p className="text-muted-foreground">
            Sizin resurslarınız mövcud deyil.
          </p>
          <Button className="mt-4">
            <Upload className="h-4 w-4 mr-2" />
            İlk Resursu Yüklə
          </Button>
        </div>
      </div>
    );
  }

  // Filter resources
  const filteredResources = resourcesData.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesType = selectedType === 'all' || resource.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-5 w-5 text-blue-500" />;
      case 'video': return <Video className="h-5 w-5 text-red-500" />;
      case 'audio': return <Music className="h-5 w-5 text-green-500" />;
      case 'image': return <Image className="h-5 w-5 text-purple-500" />;
      case 'archive': return <Archive className="h-5 w-5 text-yellow-500" />;
      case 'folder': return <Folder className="h-5 w-5 text-gray-500" />;
      default: return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'video': return 'bg-red-100 text-red-800';
      case 'audio': return 'bg-green-100 text-green-800';
      case 'image': return 'bg-purple-100 text-purple-800';
      case 'archive': return 'bg-yellow-100 text-yellow-800';
      case 'folder': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Resurslarım</h1>
          <div className="flex space-x-2">
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Yüklə
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Dərs materialları, şablonlar və digər resurslarınız
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filterlər</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Resurs axtar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Kateqoriya" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün kateqoriyalar</SelectItem>
                <SelectItem value="dərslik">Dərslik</SelectItem>
                <SelectItem value="toplu">Toplu</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="şablon">Şablon</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Fayl növü" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Bütün növlər</SelectItem>
                <SelectItem value="document">Sənəd</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="image">Şəkil</SelectItem>
                <SelectItem value="archive">Arxiv</SelectItem>
                <SelectItem value="folder">Qovluq</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Resources Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredResources.map((resource) => (
          <Card key={resource.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getTypeIcon(resource.type)}
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{resource.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {resource.description}
                    </CardDescription>
                  </div>
                </div>
                {resource.isFavorite && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getTypeColor(resource.type)}>
                    {resource.type}
                  </Badge>
                  <Badge variant="outline">{resource.category}</Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{resource.subject}</span>
                  <span>{resource.size}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{resource.uploadDate}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Download className="h-3 w-3" />
                    <span>{resource.downloadCount}</span>
                  </div>
                </div>

                {resource.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resource.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {resource.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{resource.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Bax
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Yüklə
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <div className="text-center py-8">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Uyğun resurs tapılmadı</h3>
          <p className="text-muted-foreground">
            Seçilmiş filterlərə uyğun resurs yoxdur.
          </p>
        </div>
      )}
    </div>
  );
}
