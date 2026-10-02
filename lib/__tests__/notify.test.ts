import { notifyHighPriority, shouldNotify } from "@/lib/notify";

const fetchMock = jest.fn();
const ticket = {
  id: "t1",
  title: "DB down",
  priority: "URGENT",
  category: "BUG",
  summary: "All orders fail",
};

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
  process.env.NOTIFY_WEBHOOK_URL = "https://hooks.example.com/x";
});

afterEach(() => {
  delete process.env.NOTIFY_WEBHOOK_URL;
  jest.restoreAllMocks();
});

describe("notify", () => {
  it("only notifies for HIGH and URGENT", () => {
    expect(shouldNotify("URGENT")).toBe(true);
    expect(shouldNotify("HIGH")).toBe(true);
    expect(shouldNotify("MEDIUM")).toBe(false);
    expect(shouldNotify(null)).toBe(false);
  });

  it("posts a message for urgent tickets", async () => {
    await notifyHighPriority(ticket);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const text = JSON.parse(fetchMock.mock.calls[0][1].body).text as string;
    expect(text).toContain("URGENT");
    expect(text).toContain("/tickets/t1");
  });

  it("escapes mentions and markup from ticket text", async () => {
    await notifyHighPriority({ ...ticket, title: "<!channel> & co" });
    const text = JSON.parse(fetchMock.mock.calls[0][1].body).text as string;
    expect(text).toContain("&lt;!channel&gt; &amp; co");
    expect(text).not.toContain("<!channel>");
  });

  it("skips low priority tickets", async () => {
    await notifyHighPriority({ ...ticket, priority: "LOW" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does nothing without a webhook URL", async () => {
    delete process.env.NOTIFY_WEBHOOK_URL;
    await notifyHighPriority(ticket);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("swallows network errors", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("net"));
    await expect(notifyHighPriority(ticket)).resolves.toBeUndefined();
  });
});