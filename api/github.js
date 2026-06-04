// api/github.js
export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
  const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
  const GITHUB_FILE_PATH = 'albums.json';

  // Função para buscar o arquivo do GitHub
  const getGitHubFile = async () => {
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (response.status === 404) {
        return { content: '{"albums":{}}', sha: null };
      }
      
      const data = await response.json();
      return { content: atob(data.content), sha: data.sha };
    } catch (error) {
      console.error('Erro ao buscar arquivo:', error);
      return { content: '{"albums":{}}', sha: null };
    }
  };

  // Função para salvar arquivo no GitHub
  const saveGitHubFile = async (content, sha) => {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/contents/${GITHUB_FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: 'Atualizar álbuns',
        content: btoa(content),
        sha: sha || undefined
      })
    });
    return response.ok;
  };

  if (req.method === 'GET') {
    const { id } = req.query;
    const { content } = await getGitHubFile();
    const data = JSON.parse(content);
    
    if (id) {
      const album = data.albums[id];
      if (album) {
        return res.status(200).json({ success: true, album });
      }
      return res.status(404).json({ success: false, error: 'Álbum não encontrado' });
    }
    
    return res.status(200).json({ success: true, albums: data.albums });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const { id, album } = req.body;
    if (!id || !album) {
      return res.status(400).json({ success: false, error: 'ID e álbum são obrigatórios' });
    }
    
    const { content, sha } = await getGitHubFile();
    const data = JSON.parse(content);
    data.albums[id] = album;
    
    const success = await saveGitHubFile(JSON.stringify(data, null, 2), sha);
    
    if (success) {
      return res.status(200).json({ success: true, message: 'Álbum salvo com sucesso' });
    }
    return res.status(500).json({ success: false, error: 'Erro ao salvar' });
  }

  return res.status(405).json({ success: false, error: 'Método não permitido' });
}
