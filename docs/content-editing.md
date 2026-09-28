# Quản lý nội dung bằng JSON / Editing content with JSON

Nội dung không nằm trong code giao diện. JSON là nguồn chính, không phải output phải tạo lại bằng script.

Content lives in JSON, not UI source code. These are the authoritative files, not generated output that must be rebuilt.

| Nội dung / Content | File |
|---|---|
| Khóa học, domain, cấu hình thi, bài học, flashcard / Course, domains, exam settings, lessons, cards | `data/courses/course.json` |
| Mỗi bộ câu hỏi / Each question bank | `data/questions/*.json` |
| Chữ giao diện / Interface translations | `public/i18n.json` |
| Kiểu dữ liệu / Data schema | `docs/content.schema.json` |

## Thêm bài học / Add a lesson

Trong `course.json`, sao chép một phần tử của `lessons`, đổi `id` thành ID chưa dùng, sửa `domain`, `title`, `sections`, `example`, `trap`, `references` và `cards`. Mỗi thẻ có ID riêng. Tăng hoặc giảm số bài không cần đổi code hay cấu hình navigation.

In `course.json`, copy a lesson object, assign an unused `id`, and edit its domain, bilingual title, sections, example, trap, references and cards. Every card needs its own unique ID. Navigation and progress totals follow the JSON automatically.

## Đoạn văn và danh sách / Paragraphs and lists

Mỗi section có thể dùng `text` cho một đoạn văn hoặc `blocks` để kết hợp đoạn văn và danh sách. Chọn danh sách cho các lựa chọn, tiêu chí hoặc bước thực hiện; giữ đoạn văn khi giải thích một ý liên tục. Không cần chèn HTML trong JSON.

Each section supports either `text` for a paragraph or `blocks` for mixed paragraphs and lists. Use lists for alternatives, criteria and sequential steps; preserve paragraphs for continuous explanations. No HTML is needed in JSON.

```json
{
  "heading": { "vi": "Các bước thực hiện", "en": "Steps" },
  "blocks": [
    { "type": "paragraph", "text": { "vi": "Bắt đầu bằng việc xác định mục tiêu.", "en": "Start by defining the objective." } },
    { "type": "list", "ordered": true, "items": [
      { "vi": "Chuẩn bị dữ liệu.", "en": "Prepare the data." },
      { "vi": "Huấn luyện mô hình.", "en": "Train the model." }
    ] }
  ]
}
```

Đặt `ordered: false` để dùng gạch đầu dòng. Mỗi ý có bản tiếng Việt và tiếng Anh riêng. / Set `ordered: false` for bullets. Each item has its own Vietnamese and English text.

## Thêm bộ đề / Add an exam bank

Sao chép một file trong `data/questions/`, đổi bank ID và tất cả question ID. Đặt `simulation: true` chỉ khi số câu khớp `course.exam.questions`; hiện là 85. `simulation: false` cho bộ luyện tập tùy độ dài. Tên file không được hardcode trong ứng dụng.

Copy a file in `data/questions/`, changing its bank ID and every question ID. Set `simulation: true` only when the question count matches `course.exam.questions`, currently 85. Practice-only banks can have any length. Filenames are discovered automatically.

## Quy tắc / Rules

- Chuỗi học song ngữ dùng `{ "vi": "...", "en": "..." }`. / Learning text uses bilingual objects.
- `select` bằng số phần tử của `answer`; tất cả key phải tồn tại trong options. / `select` equals the answer-array length and keys must exist in options.
- `lessonId` liên kết câu hỏi với bài ôn tương ứng. / `lessonId` links a question to its revision lesson.
- Mỗi option cần lời giải thích riêng, kể cả distractor. / Every option needs its own explanation, including distractors.
- ID ổn định giúp giữ tiến độ. Đổi ID sẽ được xem là nội dung mới. / Stable IDs preserve progress; changing an ID creates new content.
- Không đổi nghĩa một ID cũ nếu muốn so sánh lịch sử chính xác. / Do not repurpose an old ID when accurate historical comparisons matter.
- Nội dung được render dạng văn bản thuần, không chạy HTML/script từ JSON. / Content is rendered as plain text; JSON cannot execute HTML/scripts.

## Kiểm tra và nạp lại / Validate and reload

```sh
node scripts/validate-content.js
```

Sau khi lưu JSON hợp lệ, tải lại trang hoặc bấm nút ↻. Server kiểm tra thời gian sửa file và nạp nội dung mới ở request tiếp theo, không cần restart. Docker Compose mount `./data` read-only vào container: sửa JSON trên máy host có hiệu lực như trên, không cần build lại image. Thay `public/i18n.json` trong image cần build lại image, hoặc mount file này riêng khi tùy biến.

After saving valid JSON, reload the page or use ↻. The server detects changed files on the next request without restarting. Compose mounts `./data` read-only, so host edits work without rebuilding. Interface-label edits in the image need an image rebuild or a separate file bind mount.

JSON lỗi bị từ chối cùng thông báo đường dẫn field; ứng dụng không tự chấm theo dữ liệu hỏng. Bài đã bắt đầu giữ snapshot đầy đủ trong SQLite: chỉnh JSON không đổi câu/đáp án/giải thích trong bài đang làm hoặc bài đã nộp.

Invalid JSON is rejected with field-path errors; corrupt content is not silently graded. Attempts store full snapshots in SQLite, so content edits do not alter active or submitted attempts.

## Sao lưu / Backup

Nút “Xuất tiến độ JSON” tạo báo cáo cá nhân đọc được, không chứa password/session và không phải bản sao lưu phục hồi toàn bộ. Để phục hồi đầy đủ tài khoản, lịch sử và snapshot, sao lưu SQLite bằng backup nhất quán hoặc dừng container trước khi sao chép toàn bộ volume. Không chỉ copy file `.sqlite` khi database WAL đang ghi.

The progress JSON export is a readable report, not a full restorable backup. Full recovery requires a consistent SQLite backup or stopping the container before copying its volume; do not copy only the `.sqlite` file during WAL writes.
