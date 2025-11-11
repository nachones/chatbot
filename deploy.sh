#!/bin/bash

# Script de deployment para Plesk
# Ejecutar este script después de subir los archivos al servidor

echo "🚀 Iniciando deployment de MIABOT en Plesk..."

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -e "${YELLOW}Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Verificar archivo .env
echo -e "${YELLOW}Verificando configuración...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}✗ Archivo .env no encontrado${NC}"
    echo "Creando .env desde .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠ Por favor, edita el archivo .env con tu API key de OpenAI${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Archivo .env encontrado${NC}"

# Crear directorios necesarios
echo -e "${YELLOW}Creando directorios necesarios...${NC}"
mkdir -p uploads
mkdir -p logs
mkdir -p training-data
echo -e "${GREEN}✓ Directorios creados${NC}"

# Configurar permisos
echo -e "${YELLOW}Configurando permisos...${NC}"
chmod -R 755 .
chmod 666 database.sqlite 2>/dev/null || echo "database.sqlite no existe aún"
chmod 777 uploads/
chmod 777 logs/
echo -e "${GREEN}✓ Permisos configurados${NC}"

# Instalar dependencias (si no existen)
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    npm install --production
    echo -e "${GREEN}✓ Dependencias instaladas${NC}"
else
    echo -e "${GREEN}✓ node_modules/ ya existe${NC}"
fi

# Verificar base de datos
echo -e "${YELLOW}Verificando base de datos...${NC}"
if [ ! -f "database.sqlite" ]; then
    echo -e "${YELLOW}⚠ Base de datos no encontrada, se creará al iniciar${NC}"
else
    echo -e "${GREEN}✓ Base de datos encontrada${NC}"
fi

# Mostrar información
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Deployment completado${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Para iniciar la aplicación:"
echo "  1. Desde Plesk Panel: Node.js → Enable/Restart"
echo "  2. Con PM2: pm2 start ecosystem.config.js --env production"
echo "  3. Directamente: node server.js"
echo ""
echo "URLs de acceso:"
echo "  - Landing: https://tu-dominio.com/"
echo "  - Dashboard: https://tu-dominio.com/dashboard"
echo "  - Widget ejemplo: https://tu-dominio.com/example"
echo ""
echo -e "${YELLOW}⚠ No olvides configurar tu OPENAI_API_KEY en el archivo .env${NC}"
echo ""
