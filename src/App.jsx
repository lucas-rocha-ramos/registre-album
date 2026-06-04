import React, { useState, useEffect } from 'react';
import { 
  Camera, Plus, Trash2, Edit3, Link as LinkIcon, Eye, 
  PlayCircle, Grid, Download, ArrowRight, Lock, 
  Pause, Play, Image as ImageIcon, CheckCircle, X, Loader2, RefreshCw,
  BarChart3, Award, Search
} from 'lucide-react';

// Função para gerar slug amigável
const generateSlug = (name, id) => {
  const cleanName = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${cleanName}-${id.slice(-8)}`;
};

// Salvar álbum no localStorage global
const saveAlbumToGlobal = (album) => {
  const albums = JSON.parse(localStorage.getItem('global_albums') || '{}');
  albums[album.id] = album;
  // Também salvar por slug
  const slug = generateSlug(album.clientName, album.id);
  albums[slug] = album;
  localStorage.setItem('global_albums', JSON.stringify(albums));
};

const getAlbumFromGlobal = (identifier) => {
  const albums = JSON.parse(localStorage.getItem('global_albums') || '{}');
  return albums[identifier];
};

export default function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [albums, setAlbums] = useState(() => {
    const saved = localStorage.getItem('studio_albums_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('studio_albums_v2', JSON.stringify(albums));
    albums.forEach(album => saveAlbumToGlobal(album));
  }, [albums]);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    
    let meta = document.querySelector('meta[name="referrer"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = "referrer";
      meta.content = "no-referrer";
      document.head.appendChild(meta);
    }

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (hash.startsWith('#/album/')) {
    try {
      const identifier = hash.replace('#/album/', '');
      
      // Buscar pelo ID ou slug no storage global
      let albumData = getAlbumFromGlobal(identifier);
      
      // Se não encontrou, tentar buscar entre os álbuns do admin
      if (!albumData) {
        albumData = albums.find(a => a.id === identifier || generateSlug(a.clientName, a.id) === identifier);
      }
      
      if (albumData) {
        return <ClientApp album={albumData} />;
      } else {
        throw new Error('Álbum não encontrado');
      }
    } catch (e) {
      console.error("Erro ao encontrar álbum:", e);
      return <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <X size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Link de álbum inválido ou corrompido</h2>
        <p className="text-gray-400 text-sm">Verifique se o link foi copiado corretamente e tente novamente.</p>
      </div>;
    }
  }

  if (hash === '#new') {
    return <AdminEditor onSave={(newAlbum) => {
      setAlbums([newAlbum, ...albums]);
      window.location.hash = '';
    }} onCancel={() => window.location.hash = ''} />;
  }

  if (hash.startsWith('#edit_')) {
    const albumId = hash.replace('#edit_', '');
    const album = albums.find(a => a.id === albumId);
    return <AdminEditor album={album} onSave={(updated) => {
      setAlbums(albums.map(a => a.id === updated.id ? updated : a));
      window.location.hash = '';
    }} onCancel={() => window.location.hash = ''} />;
  }

  return <AdminDashboard albums={albums} setAlbums={setAlbums} />;
}

function AdminDashboard({ albums, setAlbums }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleDelete = (id) => {
    if(window.confirm('Excluir este álbum do seu histórico?')) {
      const newAlbums = albums.filter(a => a.id !== id);
      setAlbums(newAlbums);
      // Remover do global
      const globalAlbums = JSON.parse(localStorage.getItem('global_albums') || '{}');
      delete globalAlbums[id];
      localStorage.setItem('global_albums', JSON.stringify(globalAlbums));
    }
  };

  const handleCopyLink = (album) => {
    const slug = generateSlug(album.clientName, album.id);
    const url = `${window.location.origin}${window.location.pathname}#/album/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(album.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-5 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-black text-[#d4af37] p-2 rounded-xl">
            <Camera size={22} className="sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Studio Dashboard</h1>
        </div>
        <button onClick={() => window.location.hash = '#new'} className="bg-black text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-gray-800 transition-all text-sm sm:text-base shadow-sm">
          <Plus size={16} className="sm:w-5 sm:h-5" /> <span className="hidden sm:inline">Criar Álbum</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">Os Meus Envios</h2>
          <p className="text-gray-500 text-sm mt-1">Álbuns configurados para extração do Google Drive</p>
        </div>

        {albums.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 sm:p-16 text-center flex flex-col items-center">
            <div className="bg-gray-100 rounded-full p-4 mb-4">
              <ImageIcon size={40} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700">Nenhum álbum criado</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">Crie o seu primeiro álbum informando o link de uma pasta do Google Drive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map(album => (
              <div key={album.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100">
                    <img src={album.profileImage || 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=150&auto=format&fit=crop'} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{album.clientName}</h3>
                    <p className="text-sm text-gray-500">{album.subtitle}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-xl text-sm text-gray-600 mb-4">
                  📸 {album.photos?.length || 0} fotos
                </div>
                  
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <button onClick={() => window.location.hash = `#edit_${album.id}`} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(album.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                  <button onClick={() => handleCopyLink(album)} className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 text-sm ${copiedId === album.id ? 'bg-green-500 text-white' : 'bg-black text-white hover:bg-gray-800'}`}>
                    {copiedId === album.id ? <><CheckCircle size={16} /> Copiado</> : <><LinkIcon size={16} /> Copiar Link</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminEditor({ album, onSave, onCancel }) {
  const isNew = !album;
  const [formData, setFormData] = useState(album || {
    id: 'album_' + Math.random().toString(36).substr(2, 9),
    clientName: '',
    subtitle: '',
    pin: '',
    profileImage: '',
    googleDriveUrl: '',
    photos: [],
    featuredPhotos: []
  });
  
  const [extractedPhotos, setExtractedPhotos] = useState(formData.photos || []);
  const [selectedFeatured, setSelectedFeatured] = useState(formData.featuredPhotos || []);
  const [selectedProfile, setSelectedProfile] = useState(formData.profileImage || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [extractedUrl, setExtractedUrl] = useState(formData.googleDriveUrl || '');
  const [extractionProgress, setExtractionProgress] = useState(0);

  const extractPhotosFromDrive = async () => {
    if (!extractedUrl || !extractedUrl.includes('drive.google.com')) {
      alert("Por favor, insira um link válido de uma pasta do Google Drive");
      return;
    }

    setIsExtracting(true);
    setExtractionError(false);
    setExtractionMessage('A extrair fotos do Google Drive...');
    setExtractionProgress(0);

    const progressInterval = setInterval(() => {
      setExtractionProgress(prev => prev >= 90 ? 90 : prev + 15);
    }, 200);
    
    try {
      const apiUrl = `https://api-extrator-albuns.vercel.app/api/extract?url=${encodeURIComponent(extractedUrl)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success && data.photos && data.photos.length > 0) {
        setExtractionProgress(100);
        const validPhotos = data.photos.filter(photo => photo && photo.startsWith('http'));
        setExtractedPhotos(validPhotos);
        setSelectedFeatured([]);
        setSelectedProfile('');
        setExtractionMessage(`${validPhotos.length} fotos extraídas com sucesso!`);
        setFormData(prev => ({ ...prev, photos: validPhotos }));
        setTimeout(() => setExtractionMessage(''), 3000);
      } else {
        setExtractionError(true);
        setExtractionMessage(data.error || 'Não foi possível extrair as fotos. Verifique se a pasta é pública.');
        setExtractedPhotos([]);
      }
    } catch (error) {
      console.error("Erro ao extrair:", error);
      setExtractionError(true);
      setExtractionMessage('Erro ao conectar com a API. Tente novamente.');
      setExtractedPhotos([]);
    } finally {
      setTimeout(() => {
        setIsExtracting(false);
        clearInterval(progressInterval);
      }, 500);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!extractedUrl) {
      alert("Por favor, insira o link do Google Drive.");
      return;
    }
    if (extractedPhotos.length === 0) {
      alert("Por favor, extraia as fotos do Google Drive primeiro.");
      return;
    }
    const finalData = { ...formData, googleDriveUrl: extractedUrl, photos: extractedPhotos, featuredPhotos: selectedFeatured, profileImage: selectedProfile };
    onSave(finalData);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-8 sm:py-12 px-4 font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 flex items-center gap-2">
            {isNew ? <Plus size={22} /> : <Edit3 size={22} />}
            {isNew ? 'Criar Novo Álbum' : 'Editar Álbum'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={22} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Cliente / Casal</label>
              <input required type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" placeholder="Ex: Casamento João & Maria" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Subtítulo (Data ou Local)</label>
              <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" placeholder="Ex: 15 de Outubro, 2026" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">PIN de Acesso (Senha)</label>
            <input type="text" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all" placeholder="Ex: 1234 (Deixe vazio para acesso livre)" />
          </div>

          <div className="p-6 border-2 border-dashed border-[#d4af37] rounded-xl bg-yellow-50/20">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Link da Pasta no Google Drive</label>
            <p className="text-xs text-gray-500 mb-4">Cole o link partilhado da pasta e clique em "Extrair Fotos". A pasta deve estar pública.</p>
            
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input 
                type="url" 
                value={extractedUrl} 
                onChange={e => setExtractedUrl(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl p-3 bg-white focus:ring-2 focus:ring-[#d4af37] focus:border-transparent outline-none transition-all font-mono text-sm" 
                placeholder="Ex: https://drive.google.com/drive/folders/..." 
              />
              <button
                type="button"
                onClick={extractPhotosFromDrive}
                disabled={isExtracting}
                className="px-6 py-3 bg-[#d4af37] text-black font-semibold rounded-xl hover:bg-[#c4a137] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                {isExtracting ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                {isExtracting ? 'Extraindo...' : 'Extrair Fotos'}
              </button>
            </div>

            {isExtracting && (
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden">
                <div className="bg-[#d4af37] h-1.5 rounded-full transition-all duration-300" style={{ width: `${extractionProgress}%` }}></div>
              </div>
            )}

            {extractionMessage && (
              <div className={`text-sm mt-2 p-3 rounded-xl ${extractionError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {extractionError ? <X size={16} className="inline mr-2" /> : <CheckCircle size={16} className="inline mr-2" />}
                {extractionMessage}
              </div>
            )}
          </div>

          {extractedPhotos.length > 0 && (
            <>
              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Fotos Extraídas ({extractedPhotos.length})
                </label>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                  {extractedPhotos.map((photo, idx) => (
                    <div key={idx} className="relative group">
                      <img src={photo} alt={`Foto ${idx + 1}`} className="w-full aspect-square object-cover rounded-xl border border-gray-200" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">📷 Foto de Perfil</label>
                <p className="text-xs text-gray-500 mb-4">Clique em uma foto abaixo para definir como foto de perfil</p>
                
                <div className="flex justify-center mb-5">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#d4af37] shadow-md">
                    {selectedProfile ? (
                      <img src={selectedProfile} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <Camera size={28} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                  {extractedPhotos.slice(0, 30).map((photo, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedProfile(photo)}
                      className={`relative cursor-pointer transition-all rounded-xl overflow-hidden ${selectedProfile === photo ? 'ring-4 ring-[#d4af37] scale-95' : 'hover:scale-95'}`}
                    >
                      <img src={photo} alt={`Opção ${idx + 1}`} className="w-full aspect-square object-cover" />
                      {selectedProfile === photo && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <CheckCircle size={24} className="text-[#d4af37]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 border border-gray-200 rounded-xl bg-gray-50/50">
                <label className="block text-sm font-semibold text-gray-900 mb-3">⭐ Fotos em Destaque</label>
                <p className="text-xs text-gray-500 mb-4">Selecione as fotos que aparecerão no fundo da tela de acesso (máximo 5)</p>
                
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto">
                  {extractedPhotos.slice(0, 30).map((photo, idx) => {
                    const isSelected = selectedFeatured.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedFeatured(selectedFeatured.filter(i => i !== idx));
                          } else {
                            if (selectedFeatured.length < 5) {
                              setSelectedFeatured([...selectedFeatured, idx]);
                            } else {
                              alert("Você pode selecionar no máximo 5 fotos em destaque");
                            }
                          }
                        }}
                        className={`relative cursor-pointer transition-all rounded-xl overflow-hidden ${isSelected ? 'ring-4 ring-[#d4af37] scale-95' : 'hover:scale-95'}`}
                      >
                        <img src={photo} alt={`Destaque ${idx + 1}`} className="w-full aspect-square object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <CheckCircle size={24} className="text-[#d4af37]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  {selectedFeatured.length} foto(s) selecionada(s) para destaque
                </p>
              </div>
            </>
          )}

          <div className="pt-5 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onCancel} className="px-6 py-2.5 rounded-full font-medium text-gray-600 hover:bg-gray-100 transition-colors">Cancelar</button>
            <button type="submit" className="px-8 py-2.5 rounded-full font-semibold text-white bg-black hover:bg-gray-800 transition-all shadow-sm">
              {isNew ? 'Criar Álbum' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ClientApp({ album }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!album.pin);
  const [photos, setPhotos] = useState(album.photos || []);
  const [viewMode, setViewMode] = useState('story');
  const [storyIndex, setStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const [viewedPhotos, setViewedPhotos] = useState(() => {
    const saved = localStorage.getItem(`viewed_${album.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [badges, setBadges] = useState(() => {
    const saved = localStorage.getItem(`badges_${album.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [showStats, setShowStats] = useState(false);

  const theme = { primary: '#d4af37', bg: '#0a0a0a' };
  const fallbackProfile = 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?q=80&w=300&auto=format&fit=crop';
  
  const featuredPhotos = album.featuredPhotos?.map(index => photos[index]) || photos.slice(0, 3);

  useEffect(() => {
    const viewPercent = (viewedPhotos.length / photos.length) * 100;
    
    if (viewedPhotos.length === 1 && !badges.includes('first_view')) {
      setBadges([...badges, 'first_view']);
      localStorage.setItem(`badges_${album.id}`, JSON.stringify([...badges, 'first_view']));
    }
    
    if (viewPercent === 100 && !badges.includes('explorer_complete')) {
      setBadges([...badges, 'explorer_complete']);
      localStorage.setItem(`badges_${album.id}`, JSON.stringify([...badges, 'explorer_complete']));
    }
  }, [viewedPhotos, photos.length, badges, album.id]);

  const markAsViewed = (index) => {
    if (!viewedPhotos.includes(index)) {
      const newViewed = [...viewedPhotos, index];
      setViewedPhotos(newViewed);
      localStorage.setItem(`viewed_${album.id}`, JSON.stringify(newViewed));
    }
  };

  const viewPercent = (viewedPhotos.length / photos.length) * 100;

  if (!isAuthenticated) {
    return <WelcomeScreen album={album} featuredPhotos={featuredPhotos} onAuth={() => setIsAuthenticated(true)} theme={theme} fallbackProfile={fallbackProfile} />;
  }

  if (photos.length === 0) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <X size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-semibold">Nenhuma foto encontrada</h2>
        <p className="text-gray-400 text-sm mt-2 text-center">Este álbum não contém fotos.</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden text-white font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'] bg-black select-none flex flex-col relative">
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center transition-all duration-1000 scale-110 blur-[60px] opacity-40"
        style={{ backgroundImage: photos[storyIndex] ? `url(${photos[storyIndex]})` : 'none' }}
      />

      {/* Header com informações alinhadas */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={album.profileImage || fallbackProfile} className="w-10 h-10 rounded-full border-2 border-white/30 object-cover" alt="Profile" />
            <div>
              <h2 className="font-semibold text-sm text-white">{album.clientName}</h2>
              <p className="text-xs text-white/70">{album.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowStats(true)}
              className="bg-black/50 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium border border-white/10"
            >
              <BarChart3 size={14} className="text-[#d4af37]" />
              <span>{Math.round(viewPercent)}%</span>
              {badges.length > 0 && <Award size={12} className="text-[#d4af37]" />}
            </button>
            
            {album.googleDriveUrl && (
              <a
                href={album.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#d4af37] text-black rounded-full px-3 py-1.5 flex items-center gap-2 text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
              >
                <Download size={14} /> Descarregar
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats Modal */}
      {showStats && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowStats(false)}>
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full border border-white/20 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4">Estatísticas</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Progresso</span>
                  <span className="text-white font-semibold">{Math.round(viewPercent)}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-[#d4af37] rounded-full h-2 transition-all" style={{ width: `${viewPercent}%` }}></div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-3">
                <p className="text-sm text-gray-300">📸 Fotos vistas: <span className="text-white font-semibold">{viewedPhotos.length}</span> / {photos.length}</p>
                <p className="text-sm text-gray-300 mt-1">🏆 Conquistas: <span className="text-white font-semibold">{badges.length}</span></p>
              </div>
              {badges.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-gray-400 mb-2">Conquistas desbloqueadas:</p>
                  {badges.includes('first_view') && <p className="text-xs text-[#d4af37]">✓ Primeira Visualização</p>}
                  {badges.includes('explorer_complete') && <p className="text-xs text-[#d4af37]">✓ Explorador Completo</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/50 backdrop-blur-md rounded-full px-1 py-1 border border-white/10">
        <button onClick={() => setViewMode('story')} className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${viewMode === 'story' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>
          Story
        </button>
        <button onClick={() => setViewMode('gallery')} className={`px-6 py-2 rounded-full font-medium text-sm transition-all ${viewMode === 'gallery' ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}>
          Galeria
        </button>
      </div>

      <div className="flex-1 w-full h-full relative flex items-center justify-center">
        {viewMode === 'story' ? (
          <StoryViewer 
            album={album} photos={photos} index={storyIndex} fallbackProfile={fallbackProfile}
            setIndex={(idx) => {
              if(idx >= photos.length) setViewMode('gallery');
              else if (idx >= 0) {
                setStoryIndex(idx);
                markAsViewed(idx);
              }
            }} 
            isPaused={isPaused} setIsPaused={setIsPaused}
          />
        ) : (
          <GalleryViewer 
            album={album} photos={photos} theme={theme} 
            onPhotoClick={(idx) => {
              setStoryIndex(idx);
              setViewMode('story');
              markAsViewed(idx);
            }}
          />
        )}
      </div>
    </div>
  );
}

function WelcomeScreen({ album, featuredPhotos, onAuth, theme, fallbackProfile }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);

  useEffect(() => {
    if (featuredPhotos.length > 1) {
      const interval = setInterval(() => {
        setCurrentFeaturedIndex((prev) => (prev + 1) % featuredPhotos.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [featuredPhotos.length]);

  const handleLogin = () => {
    if (pin === album.pin) onAuth();
    else {
      setError(true);
      setTimeout(() => setError(false), 2000);
      setPin('');
    }
  };

  const currentPhoto = featuredPhotos[currentFeaturedIndex] || album.profileImage || fallbackProfile;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-center items-center p-4 bg-black text-white font-['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']">
      <div className="absolute inset-0 -z-10">
        <img src={currentPhoto} className="w-full h-full object-cover transition-opacity duration-1000" alt="bg" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20"></div>
      </div>

      {featuredPhotos.length > 1 && (
        <div className="absolute top-6 left-0 right-0 flex justify-center gap-1.5 z-20">
          {featuredPhotos.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-500 ${
                idx === currentFeaturedIndex ? 'w-8 bg-[#d4af37]' : 'w-4 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/20 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative z-10 mx-4">
        <div className="w-24 h-24 rounded-full overflow-hidden mb-5 border-3 border-[#d4af37] shadow-lg">
          <img src={album.profileImage || fallbackProfile} alt="Profile" className="w-full h-full object-cover" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-1 tracking-tight">{album.clientName}</h1>
        <p className="text-sm text-white/60 mb-8">Introduza o código de acesso</p>

        <div className="w-full relative mb-5">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="password" 
            value={pin} 
            onChange={(e) => setPin(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Código" 
            className="w-full bg-white/10 border border-white/20 rounded-full py-3.5 pl-12 pr-4 text-white placeholder:text-white/40 outline-none transition-all text-center tracking-widest text-base focus:border-[#d4af37] focus:bg-white/20"
            inputMode="numeric" 
            maxLength={6} 
            autoFocus
          />
        </div>

        <button onClick={handleLogin} className="w-full bg-[#d4af37] text-black font-semibold rounded-full py-3.5 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm">
          Aceder ao Álbum <ArrowRight size={18} />
        </button>
        
        {error && (
          <div className="mt-4 text-red-400 text-sm animate-pulse">
            Código incorreto. Tente novamente.
          </div>
        )}
      </div>
    </div>
  );
}

function StoryViewer({ album, photos, index, setIndex, isPaused, setIsPaused, fallbackProfile }) {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (photos[index]) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = photos[index];
    }
  }, [index, photos]);

  if (!photos[index]) return null;

  const isPortrait = imageDimensions.height > imageDimensions.width;

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <div className="absolute bottom-6 left-0 right-0 text-center z-40">
        <button 
          onClick={() => setIsPaused(!isPaused)} 
          className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1"
        >
          {isPaused ? <Play size={12} className="fill-white" /> : <Pause size={12} className="fill-white" />}
          {isPaused ? ' Continuar' : ' Pausar'}
        </button>
      </div>

      <div className="w-full h-full flex items-center justify-center">
        <img 
          src={photos[index]} 
          className={`max-w-full max-h-full object-contain ${isPortrait ? 'w-auto h-full' : 'w-full h-auto'}`} 
          alt={`Story ${index}`} 
        />
      </div>

      <div className="absolute inset-y-0 left-0 w-1/3 z-30 cursor-pointer" onClick={() => setIndex(index - 1)} />
      <div className="absolute inset-y-0 right-0 w-2/3 z-30 cursor-pointer" onClick={() => setIndex(index + 1)} />
      
      <div className="absolute bottom-20 left-0 right-0 text-center z-40">
        <p className="text-white/50 text-xs bg-black/30 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
          {index + 1} / {photos.length}
        </p>
      </div>
    </div>
  );
}

function GalleryViewer({ album, photos, onPhotoClick, theme }) {
  return (
    <div className="w-full h-full overflow-y-auto pt-20 pb-24 px-4 bg-black">
      <div className="max-w-4xl mx-auto">
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {photos.map((photo, idx) => (
            <div 
              key={idx} 
              onClick={() => onPhotoClick(idx)} 
              className="break-inside-avoid cursor-pointer group overflow-hidden rounded-xl bg-white/5 transition-all duration-300 hover:scale-[1.02]"
            >
              <div className="relative">
                <img 
                  src={photo} 
                  loading="lazy" 
                  className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105" 
                  alt={`Grid ${idx}`}
                  style={{ display: 'block' }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                  <PlayCircle size={40} className="text-white opacity-0 group-hover:opacity-100 transition-all duration-300" />
                </div>
                <div className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-0.5 text-[10px] font-medium text-white/80">
                  {idx + 1}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
