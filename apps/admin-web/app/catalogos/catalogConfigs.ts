export type CatalogPageConfig = {
  code: string;
  title: string;
  description: string;
  itemLabel: string;
  itemColumnLabel: string;
  basePath: string;
  parentCatalogCode?: string;
  parentLabel?: string;
  showDescription?: boolean;
  showAllowsSubcatalog?: boolean;
  showCardImage?: boolean;
  showSocialLinks?: boolean;
  hideSortOrder?: boolean;
  columns: Array<'code' | 'name' | 'description' | 'allowsSubcatalog' | 'country' | 'department' | 'municipality' | 'product' | 'status' | 'createdAt' | 'updatedAt' | 'actions'>;
};

export const catalogConfigs = {
  pais: {
    code: 'PAIS',
    title: 'Pais',
    description: 'Administra los paises disponibles para direcciones y operaciones del sistema.',
    itemLabel: 'paises',
    itemColumnLabel: 'Pais',
    basePath: '/catalogos/pais',
    columns: ['code', 'name', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
  departamentos: {
    code: 'DEPARTAMENTO',
    title: 'Departamentos',
    description: 'Administra departamentos asociados a un pais activo.',
    itemLabel: 'departamentos',
    itemColumnLabel: 'Departamento',
    basePath: '/catalogos/departamentos',
    parentCatalogCode: 'PAIS',
    parentLabel: 'Pais',
    columns: ['code', 'name', 'country', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
  municipios: {
    code: 'MUNICIPIO',
    title: 'Municipios',
    description: 'Administra municipios dependientes de departamentos activos.',
    itemLabel: 'municipios',
    itemColumnLabel: 'Municipio',
    basePath: '/catalogos/municipios',
    parentCatalogCode: 'DEPARTAMENTO',
    parentLabel: 'Departamento',
    columns: ['code', 'name', 'department', 'country', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
  zona: {
    code: 'ZONA',
    title: 'Zona',
    description: 'Administra zonas, comunidades, colonias, residenciales, aldeas o lugares poblados.',
    itemLabel: 'zonas / comunidades',
    itemColumnLabel: 'Zona / Comunidad',
    basePath: '/catalogos/zona',
    parentCatalogCode: 'MUNICIPIO',
    parentLabel: 'Municipio',
    columns: ['code', 'name', 'municipality', 'department', 'country', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
  productos: {
    code: 'PRODUCTOS',
    title: 'Productos',
    description: 'Administra familias principales de productos para promociones, reglas, reportes y clasificaciones.',
    itemLabel: 'productos',
    itemColumnLabel: 'Producto',
    basePath: '/catalogos/productos',
    showDescription: true,
    showAllowsSubcatalog: true,
    columns: ['code', 'name', 'description', 'allowsSubcatalog', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
  marca: {
    code: 'BRANDS',
    title: 'Marcas',
    description: 'Marcas opcionales asociadas a compras.',
    itemLabel: 'marcas',
    itemColumnLabel: 'Marca',
    basePath: '/catalogos/marca',
    showCardImage: true,
    showSocialLinks: true,
    hideSortOrder: true,
    columns: ['code', 'name', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
  tiposCalzado: {
    code: 'SHOE_TYPES',
    title: 'Tipos de calzado',
    description: 'Administra tipos de calzado asociados al producto padre Calzado.',
    itemLabel: 'tipos de calzado',
    itemColumnLabel: 'Tipo de calzado',
    basePath: '/catalogos/productos/tipos-calzado',
    parentCatalogCode: 'PRODUCTOS',
    parentLabel: 'Producto padre',
    showDescription: true,
    columns: ['code', 'name', 'product', 'description', 'status', 'createdAt', 'updatedAt', 'actions'],
  },
} satisfies Record<string, CatalogPageConfig>;
