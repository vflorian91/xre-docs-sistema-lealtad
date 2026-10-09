import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const prisma = new PrismaClient();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, 'data/guatemala-geography.tsv');
const EXPECTED_COUNTS = {
  countries: 1,
  departments: 22,
  municipalities: 340,
  zones: 20036,
};
const GEOGRAPHIC_CATALOGS = ['ZONA', 'MUNICIPIO', 'DEPARTAMENTO', 'PAIS'];
const CATALOG_DEFINITIONS = {
  PAIS: {
    name: 'Paises',
    description: 'Catalogo geografico de paises para clientes.',
  },
  DEPARTAMENTO: {
    name: 'Departamentos',
    description: 'Departamentos asociados a un pais.',
  },
  MUNICIPIO: {
    name: 'Municipios',
    description: 'Municipios asociados a un departamento.',
  },
  ZONA: {
    name: 'Zonas',
    description: 'Zonas o sectores asociados a un municipio.',
  },
};

function departmentCode(officialCode) {
  return `GT-${officialCode}`;
}

function municipalityCode(officialCode) {
  return `GT-${officialCode.slice(0, 2)}-${officialCode.slice(2)}`;
}

function zoneCode(officialCode) {
  return `GT-${officialCode}`;
}

function parseGeographyRows() {
  const raw = readFileSync(DATA_PATH, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const [header, ...rows] = lines;
  const expectedHeader = 'Codigo D\tDepartamento\tCodigo M\tMunicipio\tCodigo\tAldea O Comunidad';

  if (header !== expectedHeader) {
    throw new Error(`Encabezado TSV invalido. Esperado: ${expectedHeader}`);
  }

  const departments = new Map();
  const municipalities = new Map();
  const zones = new Map();
  const duplicateKeys = new Set();
  const invalidRows = [];

  rows.forEach((line, index) => {
    const lineNumber = index + 2;
    const columns = line.split('\t');

    if (columns.length !== 6) {
      invalidRows.push({ lineNumber, reason: `columnas=${columns.length}` });
      return;
    }

    const [departmentOfficialCode, departmentName, municipalityOfficialCode, municipalityName, zoneOfficialCode, zoneName] = columns.map((value) => value.trim());
    const errors = [];

    if (!/^\d{2}$/.test(departmentOfficialCode)) errors.push('Codigo D debe tener 2 digitos');
    if (!departmentName) errors.push('Departamento requerido');
    if (!/^\d{4}$/.test(municipalityOfficialCode)) errors.push('Codigo M debe tener 4 digitos');
    if (!municipalityName) errors.push('Municipio requerido');
    if (!/^\d{7}$/.test(zoneOfficialCode)) errors.push('Codigo debe tener 7 digitos');
    if (!zoneName) errors.push('Zona requerida');
    if (municipalityOfficialCode.slice(0, 2) !== departmentOfficialCode) errors.push('Codigo M no pertenece al departamento');
    if (zoneOfficialCode.slice(0, 4) !== municipalityOfficialCode) errors.push('Codigo de zona no pertenece al municipio');

    if (errors.length > 0) {
      invalidRows.push({ lineNumber, reason: errors.join('; ') });
      return;
    }

    const normalizedDepartmentCode = departmentCode(departmentOfficialCode);
    const normalizedMunicipalityCode = municipalityCode(municipalityOfficialCode);
    const normalizedZoneCode = zoneCode(zoneOfficialCode);

    if (departments.has(normalizedDepartmentCode) && departments.get(normalizedDepartmentCode).name !== departmentName) {
      invalidRows.push({ lineNumber, reason: 'Departamento duplicado con nombre distinto' });
    }

    if (municipalities.has(normalizedMunicipalityCode) && municipalities.get(normalizedMunicipalityCode).name !== municipalityName) {
      invalidRows.push({ lineNumber, reason: 'Municipio duplicado con nombre distinto' });
    }

    if (zones.has(normalizedZoneCode)) {
      duplicateKeys.add(normalizedZoneCode);
      return;
    }

    departments.set(normalizedDepartmentCode, {
      code: normalizedDepartmentCode,
      name: departmentName,
      officialCode: departmentOfficialCode,
    });
    municipalities.set(normalizedMunicipalityCode, {
      code: normalizedMunicipalityCode,
      name: municipalityName,
      officialCode: municipalityOfficialCode,
      departmentCode: normalizedDepartmentCode,
    });
    zones.set(normalizedZoneCode, {
      code: normalizedZoneCode,
      name: zoneName,
      officialCode: zoneOfficialCode,
      municipalityCode: normalizedMunicipalityCode,
    });
  });

  return {
    departments: [...departments.values()],
    municipalities: [...municipalities.values()],
    zones: [...zones.values()],
    duplicateCount: duplicateKeys.size,
    invalidRows,
    omittedCount: duplicateKeys.size,
  };
}

function assertParsedData(parsed) {
  const errors = [];

  if (parsed.departments.length !== EXPECTED_COUNTS.departments) {
    errors.push(`Departamentos esperados=${EXPECTED_COUNTS.departments}, encontrados=${parsed.departments.length}`);
  }
  if (parsed.municipalities.length !== EXPECTED_COUNTS.municipalities) {
    errors.push(`Municipios esperados=${EXPECTED_COUNTS.municipalities}, encontrados=${parsed.municipalities.length}`);
  }
  if (parsed.zones.length !== EXPECTED_COUNTS.zones) {
    errors.push(`Zonas esperadas=${EXPECTED_COUNTS.zones}, encontradas=${parsed.zones.length}`);
  }
  if (parsed.duplicateCount > 0) {
    errors.push(`Codigos duplicados detectados=${parsed.duplicateCount}`);
  }
  if (parsed.invalidRows.length > 0) {
    const sample = parsed.invalidRows.slice(0, 5).map((row) => `linea ${row.lineNumber}: ${row.reason}`).join(' | ');
    errors.push(`Registros invalidos=${parsed.invalidRows.length}. ${sample}`);
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

async function upsertCatalogs(tx) {
  const catalogs = new Map();

  for (const [code, definition] of Object.entries(CATALOG_DEFINITIONS)) {
    const catalog = await tx.catalog.upsert({
      where: { code },
      update: {
        name: definition.name,
        description: definition.description,
        isActive: true,
      },
      create: {
        code,
        name: definition.name,
        description: definition.description,
        isActive: true,
      },
    });
    catalogs.set(code, catalog);
  }

  return catalogs;
}

async function createManyInBatches(tx, model, rows, batchSize = 1000) {
  for (let index = 0; index < rows.length; index += batchSize) {
    await tx[model].createMany({
      data: rows.slice(index, index + batchSize),
    });
  }
}

async function loadGeography(parsed) {
  return prisma.$transaction(async (tx) => {
    const catalogs = await upsertCatalogs(tx);
    const catalogIdsByCode = Object.fromEntries([...catalogs.entries()].map(([code, catalog]) => [code, catalog.id]));

    await tx.pointPromotion.updateMany({
      where: {
        OR: [
          { zoneId: { not: null } },
          { departmentId: { not: null } },
          { municipalityId: { not: null } },
        ],
      },
      data: {
        zoneId: null,
        departmentId: null,
        municipalityId: null,
      },
    });

    for (const catalogCode of GEOGRAPHIC_CATALOGS) {
      await tx.catalogItem.deleteMany({
        where: { catalogId: catalogIdsByCode[catalogCode] },
      });
    }

    const country = await tx.catalogItem.create({
      data: {
        catalogId: catalogIdsByCode.PAIS,
        code: 'GT',
        name: 'Guatemala',
        description: 'iso2=GT; iso3=GTM',
        allowsSubcatalog: true,
        sortOrder: 0,
        isActive: true,
      },
    });

    await createManyInBatches(tx, 'catalogItem', parsed.departments.map((department, index) => ({
      catalogId: catalogIdsByCode.DEPARTAMENTO,
      parentItemId: country.id,
      code: department.code,
      name: department.name,
      description: `codigo_oficial=${department.officialCode}`,
      allowsSubcatalog: true,
      sortOrder: index,
      isActive: true,
    })));

    const departmentItems = await tx.catalogItem.findMany({
      where: { catalogId: catalogIdsByCode.DEPARTAMENTO },
      select: { id: true, code: true },
    });
    const departmentIds = new Map(departmentItems.map((item) => [item.code, item.id]));

    await createManyInBatches(tx, 'catalogItem', parsed.municipalities.map((municipality, index) => ({
      catalogId: catalogIdsByCode.MUNICIPIO,
      parentItemId: departmentIds.get(municipality.departmentCode),
      code: municipality.code,
      name: municipality.name,
      description: `codigo_oficial=${municipality.officialCode}`,
      allowsSubcatalog: true,
      sortOrder: index,
      isActive: true,
    })));

    const municipalityItems = await tx.catalogItem.findMany({
      where: { catalogId: catalogIdsByCode.MUNICIPIO },
      select: { id: true, code: true },
    });
    const municipalityIds = new Map(municipalityItems.map((item) => [item.code, item.id]));

    await createManyInBatches(tx, 'catalogItem', parsed.zones.map((zone, index) => ({
      catalogId: catalogIdsByCode.ZONA,
      parentItemId: municipalityIds.get(zone.municipalityCode),
      code: zone.code,
      name: zone.name,
      description: `codigo_oficial=${zone.officialCode}`,
      allowsSubcatalog: false,
      sortOrder: index,
      isActive: true,
    })));

    const [
      countriesCount,
      departmentsCount,
      municipalitiesCount,
      zonesCount,
      orphanDepartments,
      orphanMunicipalities,
      orphanZones,
      guatemalaCountry,
      guatemalaMunicipality,
      zone0101001,
      zone0102001,
    ] = await Promise.all([
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.PAIS } }),
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.DEPARTAMENTO } }),
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.MUNICIPIO } }),
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.ZONA } }),
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.DEPARTAMENTO, parentItemId: null } }),
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.MUNICIPIO, parentItemId: null } }),
      tx.catalogItem.count({ where: { catalogId: catalogIdsByCode.ZONA, parentItemId: null } }),
      tx.catalogItem.findFirst({ where: { catalogId: catalogIdsByCode.PAIS, code: 'GT', name: 'Guatemala' } }),
      tx.catalogItem.findFirst({ where: { catalogId: catalogIdsByCode.MUNICIPIO, code: 'GT-01-01', name: 'Guatemala' } }),
      tx.catalogItem.findFirst({ where: { catalogId: catalogIdsByCode.ZONA, code: 'GT-0101001' }, include: { parentItem: true } }),
      tx.catalogItem.findFirst({ where: { catalogId: catalogIdsByCode.ZONA, code: 'GT-0102001' }, include: { parentItem: true } }),
    ]);

    const guatemalaZones = guatemalaMunicipality
      ? await tx.catalogItem.findMany({
        where: {
          catalogId: catalogIdsByCode.ZONA,
          parentItemId: guatemalaMunicipality.id,
          name: { in: ['Zona Municipal 1', 'Zona Municipal 2', 'Zona Municipal 3'] },
        },
        select: { name: true },
      })
      : [];

    return {
      countriesCount,
      departmentsCount,
      municipalitiesCount,
      zonesCount,
      orphanDepartments,
      orphanMunicipalities,
      orphanZones,
      guatemalaCountryExists: Boolean(guatemalaCountry),
      guatemalaMunicipalityHasInitialZones: guatemalaZones.length === 3,
      zone0101001Parent: zone0101001?.parentItem?.code ?? null,
      zone0102001Parent: zone0102001?.parentItem?.code ?? null,
    };
  }, {
    maxWait: 10000,
    timeout: 120000,
  });
}

function assertLoadResult(result) {
  const errors = [];

  if (result.countriesCount !== EXPECTED_COUNTS.countries) errors.push('Conteo de paises invalido');
  if (result.departmentsCount !== EXPECTED_COUNTS.departments) errors.push('Conteo de departamentos invalido');
  if (result.municipalitiesCount !== EXPECTED_COUNTS.municipalities) errors.push('Conteo de municipios invalido');
  if (result.zonesCount !== EXPECTED_COUNTS.zones) errors.push('Conteo de zonas invalido');
  if (result.orphanDepartments !== 0) errors.push('Hay departamentos sin pais');
  if (result.orphanMunicipalities !== 0) errors.push('Hay municipios sin departamento');
  if (result.orphanZones !== 0) errors.push('Hay zonas sin municipio');
  if (!result.guatemalaCountryExists) errors.push('No existe Guatemala con codigo GT');
  if (!result.guatemalaMunicipalityHasInitialZones) errors.push('GT-01-01 no contiene las zonas municipales esperadas');
  if (result.zone0101001Parent !== 'GT-01-01') errors.push('GT-0101001 no quedo bajo GT-01-01');
  if (result.zone0102001Parent !== 'GT-01-02') errors.push('GT-0102001 no quedo bajo GT-01-02');

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

async function main() {
  const parsed = parseGeographyRows();
  assertParsedData(parsed);
  const result = await loadGeography(parsed);
  assertLoadResult(result);

  console.log('Carga geografica de Guatemala completada.');
  console.log(`Total de paises cargados: ${result.countriesCount}`);
  console.log(`Total de departamentos cargados: ${result.departmentsCount}`);
  console.log(`Total de municipios cargados: ${result.municipalitiesCount}`);
  console.log(`Total de zonas cargadas: ${result.zonesCount}`);
  console.log(`Total de duplicados detectados: ${parsed.duplicateCount}`);
  console.log(`Total de registros invalidos: ${parsed.invalidRows.length}`);
  console.log(`Total de registros omitidos: ${parsed.omittedCount}`);
  console.log(`Existe Guatemala con codigo GT: ${result.guatemalaCountryExists ? 'si' : 'no'}`);
  console.log(`Departamentos huerfanos: ${result.orphanDepartments}`);
  console.log(`Municipios huerfanos: ${result.orphanMunicipalities}`);
  console.log(`Zonas huerfanas: ${result.orphanZones}`);
  console.log(`GT-01-01 contiene Zona Municipal 1, 2 y 3: ${result.guatemalaMunicipalityHasInitialZones ? 'si' : 'no'}`);
  console.log(`GT-0101001 pertenece a: ${result.zone0101001Parent}`);
  console.log(`GT-0102001 pertenece a: ${result.zone0102001Parent}`);
}

main()
  .catch((error) => {
    console.error('No se pudo cargar la geografia de Guatemala.');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
