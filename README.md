# Cloudlingo

Không gian học AWS MLA-C02 song ngữ Việt/Anh, dùng Node.js 24 và SQLite tích hợp. Nội dung nằm trong JSON; không cần npm install.

Bilingual Vietnamese/English AWS MLA-C02 learning workspace. Node.js 24 with built-in SQLite; no runtime package installation.

## Chạy bằng Docker / Run with Docker

```sh
node scripts/setup.js
docker compose up --build -d
```

Mở http://localhost:3000. Mật khẩu nằm trong `.env` dưới `APP_PASSWORD`. Chỉ dùng mật khẩu này khi khởi tạo tài khoản lần đầu; sửa biến môi trường sau đó không đổi hash đã lưu trong SQLite.

Open http://localhost:3000 and sign in with APP_PASSWORD from `.env`. It initializes the account only on the first startup; subsequent environment changes do not replace the stored password hash.

Compose chỉ bind localhost. Khi host từ xa, đặt sau reverse proxy HTTPS và cấu hình `COOKIE_SECURE=true`. SQLite lưu ở volume `learning-data`, được giữ khi restart/recreate container. `docker compose down -v` xóa volume; không dùng nếu cần giữ tiến độ.

Compose binds localhost only. For remote hosting, use an HTTPS reverse proxy and set COOKIE_SECURE=true. SQLite persists in the learning-data volume across container restarts/recreation. Do not use `docker compose down -v` unless you intend to delete progress.

## Chạy trực tiếp / Run locally

```sh
node --env-file=.env server/index.js
```

Nếu chưa tạo `.env`, `node server/index.js` tạo tài khoản với password ngẫu nhiên và in một lần trong terminal. Dữ liệu mặc định nằm ở `runtime/`.

Without an environment file, `node server/index.js` initializes a random password and prints it once. Data defaults to runtime/.

## Kiểm tra / Checks

```sh
node scripts/validate-content.js
node --test tests/*.test.js
```

## Cấu trúc / Structure

- `data/`: nội dung khóa học và bộ đề / course and question-bank JSON.
- `public/`: HTML, CSS và JS modules cho học, flashcards, luyện đề, tiến độ.
- `server/`: HTTP API, authentication, SQLite, nội dung và chấm bài.
- `scripts/`: thiết lập và kiểm tra / setup and validation.
- `tests/`: behavioral checks.
- `docs/`: hướng dẫn sửa nội dung, schema, provenance và quyết định thiết kế.

Xem [hướng dẫn JSON](docs/content-editing.md). Không dùng kết quả luyện tập như điểm chuẩn hóa AWS. Ứng dụng chấm toàn bộ câu; bài nhiều đáp án chỉ đúng khi chọn đúng toàn bộ tập đáp án.

See the JSON editing guide. Practice accuracy is not an AWS scaled score. All questions are scored; multiple-response questions require the exact answer set.

## Trạng thái nội dung / Content status

Đang xây dựng và kiểm chứng ngân hàng câu hỏi. Chưa đủ điều kiện xem là bản hoàn tất cho ôn thi.

Question-bank authoring and verification are in progress. This is not yet a completed exam-preparation release.
