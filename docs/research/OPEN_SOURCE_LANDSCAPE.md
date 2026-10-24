# Açık kaynak ürün ve altyapı araştırması

**Araştırma tarihi:** 24 Ekim 2026 (Muster izole runtime spike dahil)
**Kapsam:** Davetle girilen, insanın yönettiği ve birden fazla kişinin kendi MCP agent bağlantılarını kullanabildiği çalışma alanı. Ürün task board, ortak bilgi/onay, sürüm geçmişi, odalara özel yetki ve görünür olayları kapsar; sunucuda agent çalıştırmaz.
**Yöntem:** Resmi repository, README, mimari, deployment/readiness ve protokol belgeleri. Kaynak projeler bu çalışma alanında kurulup test edilmedi; güvenlik denetimi yapılmadı. Repo beyanları “proje beyanı” olarak ele alınır, runtime kanıtı sayılmaz.

## Kısa sonuç

**Muster**, istenen insan + agent işbirliği ve ortak bilgi/onay modeline en yakın doğrudan alternatiftir. İlk tercih full rewrite değil, 3 kişilik kabul senaryosunu Muster üzerinde gerçekten çalıştırmaktır. Lisansı MIT olarak belirtiliyor; local açık mod ve uzaktaki deployment için OIDC zorunlu sınırı ayrı tanımlanmış. Özellik, kullanıcı/oda izinleri, bağlantı iptali, event toparlama ve backup/restore bu projede ayrıca doğrulanmalıdır. Ayrıca resmi README içinde MCP araç sayısı bölümler arasında tutarsız; sayı/tanıtım metriklerine göre karar verilmemelidir. Kaynak: [Muster resmi deposu](https://github.com/musterai/muster), [Muster deployment guide](https://github.com/musterai/muster/blob/main/docs/deployment.md).

**Orbit**, izin politikası, scope bazlı MCP araç görünürlüğü ve task/realtime mimarisi için iyi bir inceleme kaynağıdır. Ancak repository açıkça self-host durumunu **Preview** olarak tanımlıyor; resmi readiness sayfasında 2026-08-11 snapshot'ında P0/P1 açık işleri bulunuyor. Üretim tabanı olarak kabul edilmemeli. Kaynak: [Orbit repository](https://github.com/Noveum/orbit), [MCP guide](https://github.com/Noveum/orbit/blob/main/docs/mcp.md), [readiness tracker](https://github.com/Noveum/orbit/blob/main/docs/open-source-readiness.md).

**Warren**, oda ağacı ve scoped invite örneği olarak ilgili; resmi deposu kendini hackathon build diye tanımlıyor, dashboard'u kapalı tutuyor ve tek process/database sınırlarını listeliyor. Üretim kanıtı yerine tasarım referansıdır. Kaynak: [Warren repository](https://github.com/Dymyt-ry/warren).

## Karşılaştırma

| Proje | Lisans / resmi durum | Bu ürün için uygun yanı | Açık fark / risk | Önerilen kullanım |
| --- | --- | --- | --- | --- |
| [Muster](https://github.com/musterai/muster) | Repository MIT; self-host ve remote deployment belgeleri var | MCP, task board, versioned knowledge/design review, activity, SQLite ve Postgres adapter | Agent-first bazı kavramlar; ürünün invitation ve oda rol akışı kabul matrisinde deneyle sınanmalı; tool-count README tutarsız | İlk 3 kişilik ürün/teknik spike; geçerse adoption/contribution öncelikli |
| [Noveum Orbit](https://github.com/Noveum/orbit) | Apache-2.0; self-host durumu resmi README'de Preview | OAuth scope'larıyla politika uygulama, MCP tool visibility, realtime task/docs, Next/Postgres | Güncel readiness tracker'da P0/P1 açık; ürün oda hafızası/onay platformundan çok issue/project manager | Mimari/authorization/readiness örneği; üretim tabanı değil |
| [Warren](https://github.com/Dymyt-ry/warren) | Apache-2.0; “Hackathon build”, çalışma adı ve kapalı dashboard beyanı | Scoped room/invite, insan onayı, hash'li token, MCP/A2A protokol örnekleri | Agent session'larını push/wake etme bu projenin kapsamı dışı; tek process/db ve demo sınırları mevcut | Oda/davet kavramlarına referans; fork kararı için olgunluk yetersiz |
| [Mycelium](https://github.com/mycelium-io/mycelium) | Open source repo; proje README'si agent runtime/API anahtarı ve merkezi agent orchestration istiyor | Room, shared memory ve board kavramları | Otonom peer-agent koordinasyonu temel ürün sınırına aykırı | Sadece kavramsal referans |
| [Vouch](https://github.com/vouchdev/vouch) | MIT; git-native knowledge + MCP/CLI | Kaynak gösterimli, review-gated ve append-only bilgi artefact'ları | Çok kullanıcılı room, task ve realtime platform değil | Bilgi kaynak/onay modeline referans |

Bu tablo upstream README/docs anlatımlarının karşılaştırmasıdır; indirme sayısı, yıldız ve tool sayısı kalite kanıtı olarak kullanılmamıştır.

## Protokol ve altyapı kaynakları

### Muster izole runtime spike (24 Ekim 2026)

- Upstream MIT deposu geçici `/tmp` dizinine klonlandı; bu proje ve `shared-brain` değiştirilmedi.
- `npm ci`: PASS (400 paket); audit toplamı 19 (4 critical, 6 high, 9 moderate).
- `npm run build`: PASS. `npm test -- --reporter=dot`: PASS (77 dosya, 682 passed, 9 skipped).
- `npm run audit:runtime`: FAIL (10 runtime bulgusu: 2 critical, 3 high, 5 moderate; DOMPurify/proxy-addr critical, MCP SDK high).
- `npm run seed`: FAIL, `ProjectService.create` içinde SQLite foreign-key hatası.
- Loopback `127.0.0.1:6987` startup ve public HTML/API GET 200 gözlendi. Gerçek MCP UI akışı veya 3 ayrı kullanıcı oturumu smoke edilmedi.
- README açık local mode'da hesap/OIDC/API key olmadığını söylüyor; gerçek remote OIDC testi var ancak Docker/Podman daemon yokluğu nedeniyle çalıştırılmadı. Bu nedenle üç kullanıcılı oda yetkisi, grant revoke ve restore kabulü **BLOCKED**.
- Sonuç: örnek/local REST başlangıcı ve test kapsamı değerlidir; ama seed hatası, güvenlik audit bulguları ve temel multi-user davranışın doğrulanamaması nedeniyle taban olarak benimsenmedi. Bu sonuç doğrulanmayan yeteneklerin yokluğunu kanıtlamaz; yalnızca bu çalışmada kabul edilmediğini gösterir.

### MCP SDK'nın protokol sürüm uyumu

Better Auth 1.7.12 resmi MCP dokümanı OAuth/CIMD profilinde `mcp-2026-07-28` kullanımını ve SDK v2 örneğini gösteriyor. Ancak burada kilitlenen resmi `@modelcontextprotocol/server` 2.4.0 paketi runtime'da `LATEST_PROTOCOL_VERSION=2025-11-25` ve `SUPPORTED_PROTOCOL_VERSIONS` içinde en fazla `2025-11-25` yayımlıyor. `createMcpHandler({ legacy: "reject" })` ile 2026-07-28 başlatma reddedildi; 2025-11-25 de reject modunda beklendiği gibi reddedildi. Uygulama bu nedenle SDK'nın stateless legacy HTTP fallback'ini kullanır ve 2026-07-28 transport uyumlu olduğunu iddia etmez. Gerçek OAuth/MCP istemci akışı bir sonraki kabul testidir.

- MCP'nin 2026-07-28 kararlı spec revizyonu stateless request modeline geçti; eski transport session'larını ve Streamable HTTP SSE resume/redelivery'yi kaldırdı. Bu nedenle domain activity için kendi kalıcı event cursor/replay API'miz gerekir; MCP connection/session event history'nin source of truth olamaz. HTTP taşıması için Streamable HTTP gerekir, ancak SDK handler'ı token ve Host/Origin doğrulamaz; middleware sorumluluğu açıkça kurulmalı: [2026-07-28 spec announcement](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/blog/content/posts/2026-07-28-spec-ga/index.md), [spec changelog](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/changelog.mdx), [official SDK HTTP guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md).
- MCP auth OAuth resource-server modelini, RFC 9728 Protected Resource Metadata'yı, issuer/audience doğrulamayı ve güvenli client registration kurallarını tarif ediyor. 2026-07-28 sürümü DCR'dan Client ID Metadata Documents'a yöneliyor ama backward compatibility için DCR kalıyor; gerçek client'lar ile test gerekir. Gelen token kendi resource audience'ına bağlı doğrulanmalı; downstream token passthrough yapılmamalı: [official MCP authorization spec](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/authorization/index.mdx). Yeni SDK v2 stable release hattı bu protokolü uyguluyor: [official SDK releases](https://github.com/modelcontextprotocol/typescript-sdk/releases).
- PostgreSQL RLS, politika yokken default-deny sağlar; tablo sahibi normalde RLS'yi atlar, superuser/BYPASSRLS her zaman atlar. Bu nedenle RLS tek başına uygulama yetkilendirmesi değildir; migration ve runtime rolleri ayrılmalıdır: [PostgreSQL 17 row security docs](https://www.postgresql.org/docs/17/ddl-rowsecurity.html).
- Supabase self-hosting, yönetilen servisteki bazı kabiliyetlerin bulunmadığını ve bakım, güvenlik sertleştirme, backup ve disaster recovery sorumluluğunun self-host eden tarafa geçtiğini belirtiyor: [Supabase self-host docs](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/self-hosting.mdx). Local dev stack production deployment ile karıştırılmamalı.
- Next.js resmi App Router kurulumu TypeScript/Tailwind/ESLint varsayılanlarını ve Node.js minimum 20.9 gereksinimini anlatıyor: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation). UI prototipi için bu, ilk kod iskeletini hızlı başlatmaya uygundur; backend/domain servisine framework bağımlılığı eklenmemelidir.

## Önerilen karar ve sonraki araştırma

1. Muster üzerinde room owner + iki farklı insan hesabı + iki ayrı agent grant senaryosu kur.
2. Aşağıdaki kabul akışlarını kaydet: invite replay/expiry/revoke; cross-room get/search/activity deny; knowledge proposed/approval + version history; stale task update `409`; agent grant revoke sonrası yeni çağrının reddi; realtime kopma/reconnect cursor; backup/restore.
3. Her akışı ekran ve MCP istemcisi üzerinden doğrula. Yalnız README veya test sayılarını kabul kanıtı sayma.
4. Ürün gereksinimlerini karşılıyorsa upstream kullanımı/katkıyı değerlendir. Kritik boşluk varsa ve upstream düzeltmesi mümkün değilse modüler monolith oluştur.
5. Ürün adı Kithwork olarak seçildi; lisans uyumu ve kamuya yayın ayrı insan kararlarıdır. Bu araştırma kamuya yayın yetkisi vermez.

### Açık sorular

- Kullanıcılar hangi MCP istemcileriyle bağlanacak ve güncel OAuth akışı her birinde nasıl görünüyor?
- Self-host ilk kullanıcı kitlesi için Supabase stack mi, yalın PostgreSQL + seçilebilir OIDC provider mı daha işletilebilir?
- Ürün ilk sürümde tek workspace/oda modeliyle yeterli olacak mı?
- Kategori bazlı knowledge approval ne kadar esnek olmalı?
