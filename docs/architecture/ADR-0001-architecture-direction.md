# ADR-0001: Ürün tabanı ve ilk mimari yön

- **Durum:** Kabul edildi (yerel MVP kapsamı; yayın ve lisans kararı ayrı)
- **Tarih:** 24 Ekim 2026
- **Kapsam:** Yeni Kithwork projesi. Mevcut `Projeler/shared-brain` reposundan ayrıdır.

## Bağlam

Ürün; web üzerinden insana, MCP üzerinden kullanıcının ayrıca yetkilendirdiği agent istemcisine ortak oda belleği ve görev sunar. Platform agent başlatmaz, sohbet geçmişini toplamaz ve LLM'i zorunlu kılmaz. Web ve MCP aynı iş kurallarını kullanmalıdır. Oda sınırları, insan onayı, token iptali ve self-hosting güvenlik açısından yüksek risklidir.

Açık kaynak araştırmasında [Muster](https://github.com/musterai/muster) en yakın doğrudan aday çıktı. İzole spike'ta build ve 682 test geçti, fakat runtime audit 2 critical + 3 high bulgu raporladı ve seed başarısız oldu (`ProjectService.create` foreign-key hatası). Üç ayrı kullanıcılı kabul testi için Docker/Podman daemon bulunmadığından identity, room permissions, revocation ve restore kanıtlanamadı. Basit local REST başlangıcı bu ürünün temel kabulü değildir. Bu bulgularla Muster'ı taban almak uygun görülmedi; bağımsız yerel MVP inşa edilecek. [Spike raporu](../research/OPEN_SOURCE_LANDSCAPE.md#muster-izole-runtime-spike-24-ekim-2026).

## Seçenekler

1. **Muster'ı kullanmak veya katkı vermek.** En hızlı yol; ürün uygunluğu, invitation/member identity, approval workflow, farklı kullanıcı grant'leri, replay ve deployment testleri yapılmalı.
2. **Muster'ı fork etmek.** Yalnızca kritik ürün ihtiyaçları upstream'de karşılanamazsa; upstream sync, lisans/isim ayrımı ve bakım maliyeti göze alınır.
3. **Sıfırdan modüler monolith.** Kabul senaryosu kritik boşlukları gösterirse ve upstream yolu uygulanabilir değilse. Tek deployable application, domain/application service, web ve MCP adaptörleri, PostgreSQL.

## Karar

- **Bir deployable modüler monolith:** Next.js web/HTTP API ve MCP Streamable HTTP adaptörü tek uygulamada; modül sınırları `identity`, `rooms`, `knowledge`, `tasks`, `activity` şeklinde tutulur. İş kuralları framework route'larında değil server-side application/domain service'lerinde yaşar. İkinci servis gerekçesi ölçülmeden microservice ayrıştırılmaz.
- **Tek policy katmanı:** UI, REST ve MCP aynı application service + authorization policy kullanır. Tool içindeki room id ya da istemci beyanı tek başına yetki değildir; token kimliği, güncel room membership, role ve grant scope her yazma/okuma işleminde kontrol edilir.
- **MCP auth stack:** Better Auth 1.7.12 + resmi `@better-auth/mcp` + `@better-auth/cimd` ile OAuth 2.1 authorization server, resource-bound tokens, RFC 9728 metadata, PKCE/CIMD/JWKS; official MCP TypeScript SDK v2.4.0 ile stateless Streamable HTTP. Better Auth'ın CIMD metadata profili `mcp-2026-07-28`; kurulu SDK v2.4.0 ise kaynak kodunda `2025-11-25` en yeni protokol revizyonunu sunuyor. Uygulama/istemci kabulü SDK'nın bu gerçek desteklediği sürüme pinlenir; 2026-07-28 taşıma uyumluluğu iddia edilmez. Kaynak: [Better Auth MCP](https://better-auth.com/docs/plugins/mcp), [Next integration](https://better-auth.com/docs/integrations/next), [MCP TypeScript SDK releases](https://github.com/modelcontextprotocol/typescript-sdk/releases). Browser cookie MCP bearer token değildir. Her MCP isteğinde token doğrulanır; daha sonra güncel membership ve tool policy tekrar kontrol edilir.
- **MCP sınırı:** SDK handler'ı token ve Host/Origin doğrulamaz; Better Auth `requireMcpAuth` ve Next route'u önündeki origin/host koruması sorumludur. 2025-11-25 stateless request modelinde protocol-session veya SSE replay yoktur; activity cursor/replay ürün katmanında kalıcıdır.
- **İlişkisel veri:** PostgreSQL; her room-owned row `room_id NOT NULL` taşır. İlişkiler room composite foreign keys veya eşdeğer constraint ile yanlış oda bağını engeller. Uygulama yetkisi esas sınır; RLS defense-in-depth. Migration/table owner rolü ile runtime role ayrı ve runtime `BYPASSRLS`/superuser olmamalı. RLS tablo sahibi bypass'ı nedeniyle tek başına tenant güvenliği kanıtı değildir. Kaynak: [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
- **İnsan ve agent kimliği:** Hosted ve self-host seçenekleri için auth provider adapter; oda üyeliği ve rol modeli provider'dan bağımsız. Agent bağlantısı insan kimliğine bağlı, istemci/grant bazında, en az yetkili scope'lu ve iptal edilebilir olmalı. Token'lar ortak API key olarak paylaşılmaz. Provider kararı spike ve self-host operasyon karşılaştırmasından sonra.
- **Davet ve üyelik:** davet secret'ı bir kez gösterilir ve yalnız hash'i saklanır. Expiry, usage cap, revoke, throttling; redemption + usage counter + membership tek atomik transaction içinde.
- **Bilgi ve görevler:** knowledge versions immutable; approval belirli `version_id` üzerine; agent önerisi approved state'e geçemez. Task update expected version ile optimistic concurrency kullanır; stale update 409 döndürür.
- **Aktivite:** domain write ve append-only activity/outbox event aynı DB transaction içinde. Websocket/SSE sadece notification/fan-out katmanıdır; kalıcı olay kaydı gerçek kaynak, cursor replay ile reconnect toparlanır. Hassas içerik activity payload'ına alınmaz.
- **Dosya ve AI:** file object storage P2; her metadata/URL room policy altında. AI summary/search opsiyoneldir; off iken P0/P1 çalışır; AI onayı asla otomatik vermez.
- **Self-host:** tek `docker compose` kurulum yüzeyi, versioned migrations, health/metrics, backup/restore/upgrade runbook, secret rotation. Supabase değerlendirilirse self-host hizmet farkları ve operasyon yükü açıkça belgelenir.

## Bağımlılık sırası

```text
3 kişilik alternatif spike
        ↓ build / adopt / fork karar kapısı
Ürün kontratları ve veri modeli
        ↓
Kimlik ve oda policy'si + negatif yetki kontrolleri
        ↓
Knowledge version/approval + task concurrency
        ↓
MCP OAuth resource server + web aynı service katmanı
        ↓
Outbox/event replay + self-host/restore kabulü
```

## Kabul ölçütleri

- Üç farklı kullanıcı hesabı, doğru room membership ile ayrı ayrı yetkilendirilmiş istemcilerde test edildi.
- Viewer yazamaz; member approve edemez; agent kendisi için tanımlı scope ve insan grant'i dışına çıkamaz.
- Cross-room read/search/activity/file istekleri uygulama katmanında reddedilir ve DB RLS ile ikinci kez sınanır; runtime rolü owner değildir.
- Invite expiry, kullanım limiti, tekrar kullanımı, iptali ve eşzamanlı redeem test edildi.
- Knowledge onayı belirli immutable version'a bağlı; stale task update net conflict döndürüyor.
- Revocation sonrası agent'ın sonraki isteği ve açık realtime aboneliği erişemez.
- Realtime kopması sonrası cursor ile event toparlama; hassas oda içeriğinin log ve event payload'ına girmemesi doğrulandı.
- LLM kapalı; app backup, restore ve yükseltme akışı tekrar edilebilir.

## Güvenlik ve toparlanma

MCP içeriği ve kaydedilmiş knowledge, prompt injection taşıyabilecek güvenilmeyen veridir. Protokol talimatı gibi çalıştırılmaz. Tool output kaynak, versiyon ve `draft/proposed/approved` durumunu taşır. İnsan approval bir authorization kuralıdır; yalnız UI'da buton saklamak yeterli değildir.

Auth, RLS, invitation, real-time fan-out veya upload kodu açılırsa ayrıca threat model, cross-room negatif test, owner-bypass testi, revoke/replay testi ve audit yapılır. İlk prototipte gerçek kullanıcı verisi veya production credentials yoktur. Yön değiştirilirse geri alma, `apps/web` örnek ekranlarını kaldırmak ve bu ADR'yi supersede etmektir; hiçbir dış servis ya da mevcut repo değiştirilmez.

## Karar kapsamı ve ertelenenler

Bu kabul yalnızca bağımsız yerel MVP'nin modüler monolith tabanına ve denenecek auth/MCP entegrasyonuna izin verir; başarı veya production readiness iddiası değildir. Muster araştırması sonrası tabanı seçme kapısı kapandı. Ürün adı Kithwork olarak belirlendi; açık kaynak lisansı, kamuya yayın, hosted deployment, self-host production desteği ve email gönderimi kararlaştırılmadı. İlk MVP loopback local kurulumda çalışır; public exposure güvenlik değerlendirmesi ve açık kullanıcı kararı olmadan yapılmaz.
