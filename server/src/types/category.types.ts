export interface Category {
  id: string;
  name: string;
  description?: string;
  slug: string;
  icon?: string; // Lucide icon name or URL
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  description?: string;
  slug?: string;
  icon?: string;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}
