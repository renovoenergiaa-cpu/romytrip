import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { colors, spacing, typography } from '../src/theme';

const MOCK_PROFILES = [
  {
    name: 'Sofia Lorenzo',
    email: 'sofia.lorenzo.test@romy.com',
    dob: '1995-04-12',
    city: 'Milão, Itália',
    sex: 'Feminino',
    bio: 'Designer de moda escapando para a Ásia! Amo fotografia analógica, cafés escondidos e arte contemporânea. Procuro alguém pra bater perna em galerias.',
    destination: 'Tóquio, Japão',
    photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$',
    travel_styles: ['Cultural', 'Luxo acessível', 'Fotografia'],
    interests: ['Moda', 'Museus', 'Cafés'],
  },
  {
    name: 'Thiago Mendes',
    email: 'thiago.mendes.test@romy.com',
    dob: '1992-08-22',
    city: 'Rio de Janeiro, Brasil',
    sex: 'Masculino',
    bio: 'Surf e vida outdoor. Trabalhando remoto e viajando o mundo. Se não estou no mar, estou caçando a melhor comida de rua.',
    destination: 'Bali, Indonésia',
    photos: ['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$',
    travel_styles: ['Mochilão', 'Aventura', 'Praia'],
    interests: ['Surf', 'Trilhas', 'Cerveja Artesanal'],
  },
  {
    name: 'Elena Petrov',
    email: 'elena.petrov.test@romy.com',
    dob: '1997-11-03',
    city: 'Berlim, Alemanha',
    sex: 'Feminino',
    bio: 'Nômade digital, amante de techno e arquitetura. Acabei de chegar em Paris e quero descobrir a vida noturna e os melhores brechós.',
    destination: 'Paris, França',
    photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$',
    travel_styles: ['Festeiro', 'Urbano', 'Slow Travel'],
    interests: ['Música Eletrônica', 'Brechós', 'Arte'],
  },
  {
    name: 'Leo Silva',
    email: 'leo.silva.test@romy.com',
    dob: '1990-01-15',
    city: 'Lisboa, Portugal',
    sex: 'Masculino',
    bio: 'Amante de vinhos e gastronomia local. Roteiros históricos pela manhã, degustação de queijos à tarde. Alguém acompanha?',
    destination: 'Roma, Itália',
    photos: ['https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$',
    travel_styles: ['Gastronomia', 'Histórico', 'Conforto'],
    interests: ['Vinhos', 'História', 'Restaurantes Locais'],
  },
  {
    name: 'Isabella Chen',
    email: 'isabella.chen.test@romy.com',
    dob: '1998-05-27',
    city: 'Vancouver, Canadá',
    sex: 'Feminino',
    bio: 'Viajando sozinha pela primeira vez! Adoro natureza, meditação e fazer novas amizades. Vamos dividir os custos de um tour?',
    destination: 'Quioto, Japão',
    photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$',
    travel_styles: ['Econômico', 'Natureza', 'Espiritual'],
    interests: ['Yoga', 'Caminhadas', 'Fotografia'],
  },
  {
    name: 'Rafael',
    email: 'rafael.test1@romy.com',
    dob: '1993-02-14',
    city: 'São Paulo, SP',
    sex: 'Masculino',
    bio: 'Empreendedor tirando férias. Quero fugir da cidade e só relaxar num lugar paradisíaco. Aceito sugestões de praias!',
    destination: 'Bali, Indonésia',
    photos: ['https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$$',
    travel_styles: ['Resort', 'Relaxamento', 'Luxo'],
    interests: ['Mergulho', 'Spas', 'Alta Gastronomia'],
  },
  {
    name: 'Chloe Dubois',
    email: 'chloe.dubois.test@romy.com',
    dob: '1996-09-30',
    city: 'Montreal, Canadá',
    sex: 'Feminino',
    bio: 'Falante fluente de francês e inglês. Amo teatro, musicais e longas caminhadas sem rumo. Procurando alguém para dividir um apartamento.',
    destination: 'Nova York, EUA',
    photos: ['https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$',
    travel_styles: ['Urbano', 'Artes', 'Imersão'],
    interests: ['Broadway', 'Bicicleta', 'Museus'],
  },
  {
    name: 'Mateus Costa',
    email: 'mateus.costa.test@romy.com',
    dob: '1994-07-08',
    city: 'Florianópolis, Brasil',
    sex: 'Masculino',
    bio: 'Viciado em adrenalina! Vim pros Alpes pra fazer snowboard. Procuro galera pra rachar os passes de esqui e fazer o après-ski 🍻',
    destination: 'Chamonix, França',
    photos: ['https://images.unsplash.com/photo-1480429370139-e0132c086e2a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$',
    travel_styles: ['Esportes de Inverno', 'Aventura', 'Grupo'],
    interests: ['Snowboard', 'Festas', 'Montanhismo'],
  },
  {
    name: 'Camila Rodriguez',
    email: 'camila.rodriguez.test@romy.com',
    dob: '1991-12-10',
    city: 'Buenos Aires, Argentina',
    sex: 'Feminino',
    bio: 'Mochileira experiente. Já conheço 30 países! Meu foco agora é o sudeste asiático. Acampamento e hostéis são comigo mesma.',
    destination: 'Bangkok, Tailândia',
    photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$',
    travel_styles: ['Mochilão Raiz', 'Econômico', 'Aventura'],
    interests: ['Hostels', 'Cultura Local', 'Street Food'],
  },
  {
    name: 'David Kim',
    email: 'david.kim.test@romy.com',
    dob: '1989-03-25',
    city: 'Seul, Coreia do Sul',
    sex: 'Masculino',
    bio: 'Engenheiro apaixonado por tecnologia e carros. Indo para Munique conhecer museus e rodar nas autobahns. Alguém anima alugar um carro esportivo?',
    destination: 'Munique, Alemanha',
    photos: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$$',
    travel_styles: ['Roadtrip', 'Tecnologia', 'Conforto'],
    interests: ['Carros', 'Cerveja', 'História da Tecnologia'],
  },
  {
    name: 'Nina Patel',
    email: 'nina.patel.test@romy.com',
    dob: '1999-06-18',
    city: 'Londres, Reino Unido',
    sex: 'Feminino',
    bio: 'Tirando um ano sabático! Amo pintar, desenhar e conhecer pessoas criativas. Vamos desenhar no parque?',
    destination: 'Florença, Itália',
    photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$',
    travel_styles: ['Arte', 'Lento', 'Criativo'],
    interests: ['Aquarela', 'Renascimento', 'Cafés'],
  },
  {
    name: 'Omar Hassan',
    email: 'omar.hassan.test@romy.com',
    dob: '1995-10-05',
    city: 'Dubai, EAU',
    sex: 'Masculino',
    bio: 'Sempre em busca das melhores rotas de trilha e montanhas para escalar. Destino da vez: Patagônia!',
    destination: 'Bariloche, Argentina',
    photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$',
    travel_styles: ['Natureza', 'Desafios', 'Trilhas longas'],
    interests: ['Trekking', 'Fotografia de Natureza', 'Acampamento'],
  },
  {
    name: 'Valentina',
    email: 'valentina.test2@romy.com',
    dob: '1992-02-28',
    city: 'Madrid, Espanha',
    sex: 'Feminino',
    bio: 'Buscando uma parceira de viagem para curtir as ilhas gregas! Adoro festa no barco e pores do sol em Santorini.',
    destination: 'Santorini, Grécia',
    photos: ['https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$$',
    travel_styles: ['Festa', 'Mar', 'Relax'],
    interests: ['Barcos', 'Música', 'Drinks'],
  },
  {
    name: 'Felipe',
    email: 'felipe.test3@romy.com',
    dob: '1988-11-12',
    city: 'Porto, Portugal',
    sex: 'Masculino',
    bio: 'Viajante minimalista. Carrego tudo numa mochila de 30L. Amo explorar os lugares a pé e conversar com os locais.',
    destination: 'Kyoto, Japão',
    photos: ['https://images.unsplash.com/photo-1504257432389-52343af06ae3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$',
    travel_styles: ['Minimalista', 'Caminhadas', 'Cultura'],
    interests: ['Templos', 'Matcha', 'Arquitetura Tradicional'],
  },
  {
    name: 'Lara',
    email: 'lara.test4@romy.com',
    dob: '1997-08-05',
    city: 'Sydney, Austrália',
    sex: 'Feminino',
    bio: 'Deixando o canguru em casa para explorar a América do Sul. Louca para aprender a dançar salsa e comer ceviche!',
    destination: 'Lima, Peru',
    photos: ['https://images.unsplash.com/photo-1514315384763-ba401779410f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
    budget: '$$',
    travel_styles: ['Imersão Cultural', 'Gastronomia', 'Mochilão'],
    interests: ['Salsa', 'Ceviche', 'Línguas'],
  }
];

export default function DevSeedScreen() {
  // 🔒 SECURITY: This screen must NEVER be accessible in production.
  // It creates accounts with known credentials (password123!) and is for dev only.
  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  const runSeeder = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog('🚀 Iniciando Injeção de 15 Perfis Premium...');

    for (const profile of MOCK_PROFILES) {
      addLog(`Criando Auth para: ${profile.name}...`);
      
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: profile.email,
        password: 'password123!',
      });

      if (authError) {
        addLog(`❌ Erro no Auth (${profile.name}): ${authError.message}`);
        continue;
      }

      if (authData?.user) {
        // 2. Atualizar tabela public.users
        const updateData = {
          name: profile.name,
          dob: profile.dob,
          city: profile.city,
          sex: profile.sex,
          bio: profile.bio,
          destination: profile.destination,
          photos: profile.photos,
          budget: profile.budget,
          travel_styles: profile.travel_styles,
          interests: profile.interests,
        };

        const { error: dbError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', authData.user.id);

        if (dbError) {
          addLog(`❌ Erro no BD (${profile.name}): ${dbError.message}`);
        } else {
          addLog(`✅ Sucesso: ${profile.name} injetado no Banco!`);
        }
      }
    }

    addLog('🎉 INJEÇÃO FINALIZADA!');
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modo Desenvolvedor: Povoamento</Text>
      <Text style={styles.subtitle}>
        Este botão irá criar 15 perfis com fotos reais no seu Supabase usando o email "nome.test@romy.com" com senha "password123!".
      </Text>

      <TouchableOpacity 
        style={styles.button} 
        onPress={runSeeder}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>INJETAR 15 PERFIS AGORA</Text>}
      </TouchableOpacity>

      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: 80,
    backgroundColor: '#111827', // Dark theme for dev screen
  },
  title: {
    ...typography.h2,
    color: '#F9FAFB',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: '#9CA3AF',
    marginBottom: spacing.xl,
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: spacing.md,
  },
  logText: {
    color: '#10B981',
    fontFamily: 'monospace',
    marginBottom: 4,
    fontSize: 12,
  },
});
