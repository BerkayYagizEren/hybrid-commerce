export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  children?: CategoryItem[];
  _count?: {
    products: number;
    subProducts: number;
    children?: number;
  };
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
}

export interface UpdateCategoryInput {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  description?: string;
}

export interface CategoryActionResult {
  success: boolean;
  message?: string;
  error?: string;
  category?: CategoryItem;
}
