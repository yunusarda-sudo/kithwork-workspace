# Ürün ve mühendislik yol haritası

**Durum:** Yerel MVP inşası · **Tarih:** 24 Ekim 2026 · **Ürün adı:** Kithwork
**Kapsam:** Bu belge bağımsız Kithwork projesini tanımlar. “Shared Brain for AI Agents” eki ürün girdisi veya mimari gereksinim olarak kullanılmaz; mevcut `Projeler/shared-brain` deposu bu projenin parçası değildir. Ürün yönü pilotta doğrulanmalıdır.

## Amaç

Küçük ekiplerin, her üyenin kendi AI aracını kullanarak ortak oda belleği, görevler, insan onaylı kararlar ve açıkça bildirilen aktivite etrafında çalışmasını sağlamak. Sunucu agent çalıştırmaz ve özel sohbet geçmişini toplamaz. Temel ürün LLM olmadan çalışır.

## İlk kullanıcı sonucu

Üç kişilik bir ekip bir oda kurar; iki davetli üye kendi kimliğiyle katılır. Her insan kendi MCP istemcisini yetkilendirir. Bir agent bilgi değişikliği önerir; başka üyeler öneriyi onaysız olarak görür. Owner sürümü onaylar. İki eski görev sürümüyle eşzamanlı güncelleme yapınca ikinci istek çakışma alır. Olaylar doğru odadaki kişilere görünür. Bir bağlantı iptal edildiğinde sonraki istek erişemez.

## İlke ve karar kapıları

1. **Önce ürün uyumu:** Muster izole runtime spike tamamlandı; güvenlik bulguları, seed hatası ve Docker/Podman yokluğu yüzünden 3 kişilik kabul doğrulanmadı. Kanıta göre taban kararı bağımsız yerel MVP inşası olarak kapandı.
2. **Ayrı taban kararı:** Muster adoption/fork şu an seçilmedi. Orbit ve Warren tasarım referansıdır; olgunluk notları araştırma belgesinde.
3. **Kodlama paralel ilerler:** UI OpenCode beam-free işçisi tarafından, güvenlik sınırları ve backend Codex tarafından paralel geliştirildi. Web/MCP ortak application service kullanır.
4. **Kamuya yayın kapısı:** Marka, MIT/Apache lisans seçimi, katkı politikası, güvenlik iletişimi ve üçüncü taraf varlık/lisans denetimi gerekir. Bu görev yayın yetkisi vermez.

## Aşamalar

Efor, tek deneyimli geliştirici için yaklaşık kişi-gün aralığıdır; 3 kişilik ekiple paralellik takvim süresini azaltabilir.

| Sıra | Aşama | Efor | Durum | Kabul ölçütü |
| --- | --- | ---: | --- | --- |
| 0 | Alternatifleri kurup karar ver | 2–4 | **DONE_WITH_LIMITS** | Muster klon/build/test/seed/runtime bulguları raporlandı; 3-kullanıcı davranışı BLOCKED kaldı; bağımsız local MVP kararı verildi |
| 1 | Bilgi mimarisi ve arayüz | 3–5 | **DONE** | Örnek dashboard gerçek verili oda/görev/knowledge ve auth arayüzüne çevrildi; invite katılımı eklendi |
| 2 | Temel oda ve web P0 | 8–14 | **DONE_WITH_LIMITS** | Signup, oda, tek kullanımlı davet, üyelik, PostgreSQL/RLS; owner onayı; stale task `409`; üç kullanıcı, oda izolasyonu ve bilgi sürüm geçmişi yerel API'de doğrulandı |
| 3 | Agent bağlantısı ve MCP P1 | 8–14 | **DONE_WITH_LIMITS** | PKCE OAuth, resource-bound token, scopes, MCP initialize/tools/call ve grant revoke akışı kodlanıp entegre HTTP istemcisiyle doğrulandı; harici Claude/Codex istemcisi doğrulanmadı |
| 4 | Aktivite, dayanıklılık ve self-host | 6–10 | **IN_PROGRESS** | Üretim Compose/Caddy/DB rol ve operasyon taslağı eklendi; daemon smoke, gerçek sunucu TLS, offsite backup ve migration upgrade kabulü açık |
| 5 | Dosya/GitHub ve AI opsiyonları | 8–16 | NOT_STARTED | P2/P3: oda kapsamlı dosya ve opsiyonel entegrasyonlar; AI kapalıyken çekirdek tam çalışıyor; AI hiçbir zaman otomatik onay vermiyor |
| 6 | Pilot, açık kaynak hazırlığı ve genişleme | 5–10 | NOT_STARTED | Üç kişilik pilot; lisans/isim/tehdit modeli/katkı rehberi; kontrollü kararlı sürüm; P4 çoklu workspace ancak ölçülmüş ihtiyaçla |

## P0 görevleri

- [x] Kaynak araştırması başlatıldı ve ilk açık kaynak haritası çıkarıldı: [araştırma](../research/OPEN_SOURCE_LANDSCAPE.md).
- [x] Taslak mimari yönü ve güvenlik karar kapıları kaydedildi: [ADR-0001](../architecture/ADR-0001-architecture-direction.md).
- [x] OpenCode ile paralel, örnek verili dashboard ve bilgi inceleme panelleri başlatıldı; lint ve production build geçti.
- [x] Muster izole runtime spike'ını çalıştır; seed/audit/test/daemon sınırlamalarını kaydet.
- [x] Build/adopt/fork kararını kanıta göre güncelle: bağımsız local MVP inşası.
- [x] Ürün adı Kithwork olarak belirlendi.
- [ ] Açık kaynak lisansı ve yayın politikasını kararlaştır.
- [ ] Taslak kullanıcı akışını ekiple doğrula; prototip kapsamını bunun sonucuna göre güncelle.
- [x] Better Auth + resmi MCP/CIMD + MCP SDK v2 tabanlı auth/MCP endpointini kur.
- [x] PostgreSQL migrationları, runtime DB rolü, RLS politikaları ve core room/task/knowledge/invite/activity servislerini kur.
- [x] Web'den signup/signin, oda, task, invite, knowledge propose/owner approval akışını bağla.
- [x] Runtime role ile RLS çapraz oda negatif testini; owner/member approval ve task stale `409` doğrula.
- [x] Entegre OAuth/MCP HTTP akışında consent, resource-bound scope, tool call ve consent revoke sonrası ret doğrula.
- [x] Arkadaşların aynı paylaşımlı oda davetini kullanıp ortak bağlamı kullanan agent promptu ve bağlantı rehberini yaz; dış istemci OAuth/tool kabulünü ayrıca açık bırak.
- [x] Knowledge sürüm numaralarının concurrent tekliflerde ayrıldığını; process restart sonrası session/oda kalıcılığını doğrula.
- [x] Sürüm bağımlılıklarını ayır; app paketinden Drizzle Kit/esbuild zincirini çıkarıp `npm audit` bulgularını temizle.
- [x] Loopback PostgreSQL yedeğini özel dosyaya al; ayrı veritabanına geri yükleyip satır sayısı, migration owner, runtime grant ve RLS izolasyonunu doğrula.
- [x] Oda sahibinin iptal edebildiği, 7 günlük ve en fazla 100 üyelikli ortak daveti; 20 eşzamanlı katılımcıyla limit ve tekrar denemede idempotency doğrula.
- [x] Linux self-host için özel production Compose, Caddy otomatik HTTPS, private secret bootstrap, sınırlı DB rolleri ve ayrı DB'ye geri yükleme komutlarını/runbook'u hazırla; yapılandırmayı gerçek sunucuda çalıştırma henüz doğrulanmadı.
- [x] systemd Linux hostları için günlük yerel yedek zamanlayıcısı ve sınırlı dosya adı/yaş kapsamıyla 30 günlük varsayılan saklama ekle; timer kurulumunu bu geliştirme makinesinde çalıştırma.
- [ ] Compose temiz başlangıç, Compose volume yedeği, migration upgrade ve self-host runbook kabulini tamamla.

## Doğrulama planı

- Her milestone için davranışı kanıtlayan kabul akışları yazılır. Oda izolasyonu her web/API/MCP/search/activity/file yolunda olumsuz testlerle kanıtlanır.
- Veritabanı RLS testleri tablo sahibi olmayan runtime rolüyle yapılır; migration sahibi ile runtime rolü ayrıdır.
- MCP testleri protokol sürümüne ve en az iki gerçek istemciye karşı çalışır; SDK sürümü/özellikleri kaynak kodu açılırken sabitlenir.
- Realtime yayın teslimat garantisi varsayılmaz; kalıcı olay tablosu + cursor/replay ile toparlama kanıtlanır.
- Self-host kabulü `docker compose up`, ilk kurulum, upgrade, backup ve restore akışlarını temiz bir ortamda tekrar etmeyi içerir.
- LLM kapalıyken P0/P1 kabul senaryoları geçmelidir.

## Temel riskler ve toparlanma

| Risk | Önlem / toparlanma |
| --- | --- |
| Yanlış odaya veri veya canlı olay sızıntısı | Domain servisinde güncel oda üyeliği; RLS ek savunma; owner olmayan DB rolüyle negatif testler; realtime fan-out yalnız oda üyelerine |
| Çalınmış davet veya agent token'ı | Hash'li tek gösterim token, süre/kullanım/iptal sınırları; ayrı kullanıcı/grant; iptal sonrası anında reddetme |
| Eski sürümün sessizce ezilmesi | Immutable knowledge versions, expected-version task updates, transaction ve 409 conflict |
| MCP istemci/spec uyumsuzluğu | Güncel spec/SDK sürümünü kaydet; birkaç gerçek istemciyle smoke; uyumsuz eski taşıma protokolüne bağlanma |
| Öneri içine gömülü talimat / prompt injection | Oda içeriğini güvenilmeyen veri olarak etiketle; approval ve yazma sınırlarını araç/politika katmanında uygula |
| Self-host kapsamının büyümesi | Tek deploy edilebilir uygulama; Compose ve migration/backup/restore kabulü; yönetilen servis bağımlılıklarını açıkça belgele |
| Alternatif projeyi yeterince değerlendirmeden yeniden yazmak | Aşama 0 kararı kapatılana dek prod sınırlarına kod yazma; gerekirse prototipi atıp upstream'e katkı/adoption |

## Uygulama durumu

- `apps/web`: gerçek Better Auth oturumu, PostgreSQL kalıcılığı, server-side API ve MCP OAuth/Streamable HTTP sunar; mevcut tarayıcı/API kabulü geçmiştir.
- Oda üyeliği, owner rolü ve OAuth grant her işlemde kontrol edilir; RLS tablo sahibi olmayan runtime DB rolüyle ayrıca doğrulandı.
- Son production build, TypeScript, lint, runtime migration komutu, dependency audit ve Compose yapılandırma çözümlemesi geçti. Build, yerel `.env.local` olmadan da geçti.
- Üretim sunucusu yeniden başlatıldı; aynı cookie ile session ve PostgreSQL oda verisi okundu. Tarayıcı sign-in ekranı ve OAuth metadata endpointleri `200` verdi.
- Drizzle Kit CLI web uygulamasının bağımlılık ağacından çıkarıldı; migrationlar production `drizzle-orm` migrator ile çalışıyor. Schema generation/Studio, sabit sürüm CLI ve ORM'i geçici araç dizininde kullanıp komut sonunda temizliyor; generation ve `drizzle-kit check` geçti. `npm audit` temiz.
- Loopback PostgreSQL için özel izinli custom dump alındı ve yeni, ayrı bir veritabanına geri yüklendi; fixture satırları, migration owner, runtime grant ve RLS geçişi doğrulandı. Aktif DB'ye dokunulmadı.
- Ortak grup daveti yeni/yalıtılmış bir veritabanında doğrulandı: aynı token ile farklı kullanıcılar aynı odaya katıldı; 20 kullanıcı 5 kişilik limitte yarışınca tam 5 kişi katıldı; aynı kullanıcının tekrar denemesi ek kota tüketmedi; süre, iptal, owner-only yönetim, token hash'i ve oda izolasyonu kontrol edildi.
- Production Compose yapılandırması parse edildi. İlk izole `ach-selfhost-smoke` denemesinde PostgreSQL 18 sağlıklı başladı; Next compile 2.8 dakikada geçti ancak Docker Desktop TypeScript adımında yanıt vermedi. Salt-okunur tanıda Docker daemon yaklaşık 4.1 GB RAM sunuyordu ve çok sayıda başka proje container'ı çalışıyordu; host diskinde 57 GiB boş yer vardı. Bu kaynak baskısı olası neden, OOM kanıtı yok. Yalnızca test projesinin etiketli konteyner/ağı/volume'u sonradan durdurulup kaldırıldı. Migration ve HTTP kabulü tamamlanmadı.
- Self-host başlangıç iyileştirmesi: `/api/healthz` kısa bir PostgreSQL `SELECT 1` kontrolü yapar, havuz bağlantı beklemesini ve statement süresini sınırlar, hata ayrıntısı sızdırmadan `503` ve `Cache-Control: no-store` döndürür. Production Compose web sağlık kontrolünü ekler ve Caddy'yi web sağlıklı olana kadar bekletir. Yerel çalışan web sürecinde endpoint `200` döndürdü; typecheck, lint ve Compose config parse geçti. Konteyner içinde temiz başlangıç/HTTP kabulü Docker Desktop kaynak sınırı nedeniyle henüz doğrulanmadı.
- Restore hata güvenliği: `scripts/restore-production.sh` arşivi `--single-transaction` ile uygular ve hata/kesintide sadece ürettiği restore hedefini silmeyi dener. Bu değişiklikte Bash sözdizimi ve hedef sınırı incelendi; veritabanı restore’u çalıştırılmadı, runtime kabulü açık.
- Restore sonrası yedek hedefi: `scripts/backup-production.sh`, çalışan DB konteynerinin eski `POSTGRES_DB` ortam değişkenine güvenmek yerine `.env.production` içindeki doğrulanmış `APP_DB_NAME` değerini `pg_dump`'a açıkça geçirir. Sentetik Docker stub'ı hedef DB argümanını, dump'ın `0600` izinlerini ve geçersiz DB adının Docker çağrısından önce reddedilmesini doğruladı; gerçek restore edilmiş DB'den yedek alma henüz çalıştırılmadı.
- MCP initialize sunucu adı, ürün adıyla tutarlı olacak şekilde `Kithwork` olarak güncellendi. TypeScript ve lint kontrolleri geçti; kaynak smoke testi adın doğru olduğunu ve sekiz MCP aracının kayıtlı kaldığını doğruladı. ChatGPT/Claude istemci ekranındaki görünüm gerçek bağlantıda henüz denenmedi.
- Aktivite cursor doğrulaması `recentActivity` ortak servisinde DB transaction'ından önce yapılır; boş veya parse edilemeyen tarih `400` olur. Odadaki üyelik kontrolü ve geçerli timestamp filtresi korunur. Cursor davranış smoke testi, typecheck ve lint geçti; gerçek DB/HTTP/MCP çağrısı bu değişiklikte çalıştırılmadı.
- `get_recent_activity` cursor verilmediğinde en yeni 100 kaydı kronolojik sırada döndürür. Sayfalama için event ID cursor'ı tam PostgreSQL timestamp hassasiyetiyle `(createdAt, id)` sıralamasını sürdürür; eski ISO timestamp cursor'ları geriye dönük kabul edilir. Kaynak ve parser kontrolleri ile typecheck/lint geçti; gerçek event tablosunda replay kabulü hâlâ bekliyor.
- Tarayıcı çalışma alanı seçili odanın son aktivitesini gösterir; 15 saniyede bir ve kullanıcı isteğiyle yeniler. Yükleniyor/boş/hata durumları vardır; olay payload içeriği gösterilmez. Typecheck, lint ve oda kapsamı/payload kaynak smoke kontrolü geçti; oturum açmış tarayıcıda oda üyeleriyle canlı kabul bu değişiklikte henüz yapılmadı.
- Migration image güncelliği: production deploy scripti ve self-host upgrade runbook’u migrationı çalıştırmadan önce `migrate` servisini `--build` ile güncel checkouttan oluşturur. Bash sözdizimi ve Compose config doğrulandı; deploy/migration çalıştırılmadı.
- Deploy sıralaması: `deploy-production.sh` web image’ını DB servisini başlatmadan ve migration uygulamadan önce build eder; başarılı migration sonrasında hazır image’ı başlatır. Böylece web build hatası şema değişikliğinden önce yakalanır. Bash, Compose config ve komut sırası statik olarak doğrulandı; deploy çalıştırılmadı.
- Ayrı izole PostgreSQL 18 kurulumunda production init scripti doğrulandı: veritabanı sahibi `agent_hub_owner`; migrator ile TCP oturumunda `current_user=agent_hub_owner`, `session_user=agent_hub_migrator`; runtime rolü tabloya default privilege üzerinden insert yaptı ve her iki login de superuser/createdb/createrole değil. Sentetik DB, konteyner, ağ ve volume test sonunda kaldırıldı.
- Ana çalışma ağacında `npm run typecheck` ve `npm run lint` geçti. systemd backup installer sözdizimi ve sentetik secret/retention akışları geçti; gerçek Linux timer kurulmadı. Self-host paketi dağıtılmadı ve production-ready kabul edilmedi.
- Root-run systemd yedek timer kurucusu, `/opt` veya `/srv` ile checkout arasındaki tüm üst klasörlerin root sahipliği ve yazma izinlerini artık tek tek doğrular. Bash sözdizimi, yol denetimi kaynak smoke'u ve denetimlerin systemd unit yazımından önce kaldığı statik kontrol geçti; Linux'ta kurulum veya `systemctl` çalıştırılmadı.
- Uygulama katmanı ve MCP aynı domain kurallarını çağırır; adaptörler iş kuralı içermemeli.
- Bu yol haritası yaşayan kaynaktır; her karar kapısı kapandığında durum, kanıt ve sonraki adım güncellenir.
