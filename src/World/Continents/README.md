# Continents Directory

This directory contains continent-specific map definitions organized by continent name. Each subdirectory holds the map data for all areas within that continent.

## Structure

```
Continents/
└── Coastal-Village/
    └── maps.ts          # Map definitions for Fishing Village and Northern Forest
```

## Adding New Continents

1. Create a new directory under `Continents/` (e.g., `Northern-Continent/`)
2. Add a `maps.ts` file with map definitions and a type for map names
3. Export the map name type and map objects
4. Add the map name type to the union in `../map.library.ts`
5. Register the maps in the appropriate lookup function in `../index.ts`
