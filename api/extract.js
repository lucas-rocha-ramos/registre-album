// api/extract.js
export default async function handler(req, res) {
    // Cole TODO o código acima aqui, mas com a estrutura export default
  const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: '*' }));

// Função para extrair IDs de imagem do HTML da pasta
function extractImageIds(html) {
    const ids = new Set();
    
    // Padrões mais abrangentes para encontrar IDs de arquivos
    const patterns = [
        /\/file\/d\/([a-zA-Z0-9_-]{25,})/g,
        /\/uc\?id=([a-zA-Z0-9_-]{25,})/g,
        /\["([a-zA-Z0-9_-]{25,})"/g,
        /"([a-zA-Z0-9_-]{28,})"/g,
        /data-id="([a-zA-Z0-9_-]{25,})"/g,
        /id=([a-zA-Z0-9_-]{25,})/g,
        /\/d\/([a-zA-Z0-9_-]+)\/view/g,
        /itemId=([a-zA-Z0-9_-]+)/g,
        /https:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/g,
        /\["([a-zA-Z0-9_-]{33,})"\]/g,
        /"([a-zA-Z0-9_-]{33,})"/g
    ];
    
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(html)) !== null) {
            const id = match[1];
            if (id && id.length >= 25 && id.length <= 45) {
                ids.add(id);
            }
        }
    }
    
    return Array.from(ids);
}

// Função para verificar se um ID é uma imagem válida
async function isValidImage(id) {
    const urls = [
        `https://lh3.googleusercontent.com/d/${id}=w100`,
        `https://drive.google.com/thumbnail?id=${id}&sz=w100`,
        `https://drive.google.com/uc?export=view&id=${id}`
    ];
    
    for (const url of urls) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(url, { method: 'HEAD', signal: controller.signal });
            clearTimeout(timeoutId);
            
            const contentType = response.headers.get('content-type') || '';
            
            if (response.ok && contentType.startsWith('image/')) {
                return true;
            }
        } catch (e) {
            // Continua tentando outras URLs
        }
    }
    return false;
}

// FUNÇÃO PRINCIPAL: Carrega TODAS as páginas da pasta (SCROLL INFINITO)
async function loadAllPages(folderId) {
    let allIds = [];
    let pageToken = null;
    let pageCount = 0;
    let hasMore = true;
    const maxPages = 20; // Aumentado para capturar muitas páginas
    
    console.log(`🔄 Iniciando scraping da pasta: ${folderId}`);
    
    while (hasMore && pageCount < maxPages) {
        try {
            // Constrói URL com token de página se existir
            let url = `https://drive.google.com/drive/folders/${folderId}`;
            if (pageToken) {
                url += `?pageToken=${encodeURIComponent(pageToken)}`;
            }
            
            console.log(`📄 Carregando página ${pageCount + 1}...`);
            
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
                }
            });
            
            if (!response.ok) {
                console.log(`❌ Erro ao carregar página: ${response.status}`);
                hasMore = false;
                break;
            }
            
            const html = await response.text();
            
            // Extrai IDs desta página
            const pageIds = extractImageIds(html);
            console.log(`📸 Encontrados ${pageIds.length} IDs na página ${pageCount + 1}`);
            
            // Adiciona IDs únicos
            for (const id of pageIds) {
                if (!allIds.includes(id)) {
                    allIds.push(id);
                }
            }
            
            // PROCURA O PRÓXIMO TOKEN DE PAGINAÇÃO (várias formas)
            let nextToken = null;
            
            // Padrão 1: token em JSON
            const jsonMatch = html.match(/"nextPageToken"\s*:\s*"([^"]+)"/);
            if (jsonMatch) nextToken = jsonMatch[1];
            
            // Padrão 2: token em URL
            const urlMatch = html.match(/[?&]pageToken=([^&"'\s]+)/);
            if (urlMatch && !nextToken) nextToken = urlMatch[1];
            
            // Padrão 3: token em variável JavaScript
            const jsMatch = html.match(/pageToken\s*=\s*"([^"]+)"/);
            if (jsMatch && !nextToken) nextToken = jsMatch[1];
            
            // Padrão 4: token em data attribute
            const dataMatch = html.match(/data-page-token="([^"]+)"/);
            if (dataMatch && !nextToken) nextToken = dataMatch[1];
            
            // Verifica se tem botão "Carregar mais"
            const hasLoadMore = html.includes('load-more') || 
                               html.includes('Load more') || 
                               html.includes('Carregar mais');
            
            if (nextToken && nextToken !== pageToken) {
                pageToken = nextToken;
                console.log(`➡️ Próximo token encontrado, continuando...`);
                pageCount++;
                
                // Delay para não sobrecarregar o Google
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else if (hasLoadMore && pageCount < maxPages - 1) {
                // Se tem botão "carregar mais" mas não achamos token, tenta simular scroll
                console.log(`🔄 Detectado botão "carregar mais", tentando próxima página...`);
                pageCount++;
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                console.log(`✅ Não há mais páginas para carregar`);
                hasMore = false;
            }
            
        } catch (error) {
            console.error(`❌ Erro na página ${pageCount + 1}:`, error.message);
            hasMore = false;
        }
    }
    
    console.log(`🎯 Total de IDs únicos encontrados: ${allIds.length}`);
    return [...new Set(allIds)];
}

// Função para tentar via API pública do Google Drive (fallback)
async function fetchViaGoogleAPI(folderId) {
    try {
        const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&fields=files(id,name,mimeType),nextPageToken&pageSize=1000`;
        
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.files) {
                const imageIds = data.files
                    .filter(file => file.mimeType && file.mimeType.startsWith('image/'))
                    .map(file => file.id);
                
                console.log(`📡 API retornou ${imageIds.length} imagens`);
                return imageIds;
            }
        }
    } catch (e) {
        console.log('API pública falhou, usando scraping');
    }
    return [];
}

app.get('/api/extract', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(200).json({ success: false, error: 'Nenhum link fornecido.' });
    }

    try {
        // Extrai o folder ID
        let folderId = url.match(/\/folders\/([a-zA-Z0-9_-]+)/)?.[1];
        if (!folderId) {
            folderId = url.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
        }
        
        if (!folderId) {
            return res.status(200).json({ success: false, error: 'Link de pasta inválido.' });
        }

        console.log(`\n🚀 Iniciando extração da pasta: ${folderId}`);
        
        // TENTATIVA 1: API do Google Drive
        let allIds = await fetchViaGoogleAPI(folderId);
        
        // TENTATIVA 2: Scraping com paginação (se API não funcionou ou pegou poucos)
        if (allIds.length === 0) {
            console.log('📡 API não retornou resultados, usando scraping com paginação...');
            allIds = await loadAllPages(folderId);
        } else if (allIds.length < 100) {
            console.log('⚠️ API retornou poucos resultados, complementando com scraping...');
            const moreIds = await loadAllPages(folderId);
            for (const id of moreIds) {
                if (!allIds.includes(id)) {
                    allIds.push(id);
                }
            }
            console.log(`📊 Total após complementar: ${allIds.length}`);
        }
        
        if (allIds.length === 0) {
            return res.status(200).json({ 
                success: false, 
                error: 'Não foi possível encontrar nenhuma imagem. Verifique se a pasta está pública.' 
            });
        }
        
        console.log(`\n🔍 Verificando ${allIds.length} IDs para validar imagens...`);
        
        // Processa TODAS as imagens (sem limite)
        const validPhotos = [];
        const batchSize = 15; // Processa em lotes para não sobrecarregar
        
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(async (id) => {
                    const isValid = await isValidImage(id);
                    if (isValid) {
                        return `https://lh3.googleusercontent.com/d/${id}=w2000`;
                    }
                    return null;
                })
            );
            
            for (const result of batchResults) {
                if (result) validPhotos.push(result);
            }
            
            console.log(`📸 Processados ${Math.min(i + batchSize, allIds.length)}/${allIds.length} IDs - ${validPhotos.length} imagens válidas`);
            
            // Delay para não sobrecarregar
            if (i + batchSize < allIds.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        if (validPhotos.length === 0) {
            return res.status(200).json({ 
                success: false, 
                error: `Nenhuma imagem válida encontrada. Foram encontrados ${allIds.length} IDs, mas nenhum corresponde a uma imagem.` 
            });
        }
        
        console.log(`\n✅ EXTRAÇÃO CONCLUÍDA: ${validPhotos.length} imagens válidas!\n`);
        
        res.status(200).json({ 
            success: true, 
            count: validPhotos.length,
            totalIdsFound: allIds.length,
            photos: validPhotos,
            folderUrl: url
        });
        
    } catch (error) {
        console.error("❌ Erro no Backend:", error);
        res.status(200).json({ 
            success: false, 
            error: 'Erro no servidor: ' + error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

module.exports = app;
}
