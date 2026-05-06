// supabase/functions/whatsapp-webhook/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    console.log("Webhook received:", body);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const eventName = (body.event || '').toLowerCase();
    if (eventName === 'messages.upsert') {
      const msg = body.data;
      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '');
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
      const fromMe = msg.key.fromMe;

      if (!text) return new Response('ok');

      // 1. Upsert conversa
      const { data: conv, error: convError } = await supabase
        .from('whatsapp_conversations')
        .upsert({ 
          phone, 
          last_message: text, 
          last_message_at: new Date().toISOString() 
        }, { onConflict: 'phone' })
        .select()
        .single();

      if (convError) {
        console.error("Error upserting conversation:", convError);
        return new Response('error', { status: 500 });
      }

      // 2. Inserir mensagem
      const { error: msgError } = await supabase.from('whatsapp_messages').upsert({
        conversation_id: conv.id,
        phone,
        message: text,
        from_me: fromMe,
        message_id: msg.key.id,
        timestamp: new Date(msg.messageTimestamp * 1000).toISOString()
      }, { onConflict: 'message_id' });

      if (msgError) {
        console.error("Error inserting message:", msgError);
        return new Response('error', { status: 500 });
      }
    }

    return new Response('ok');
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new Response('error', { status: 500 });
  }
});
