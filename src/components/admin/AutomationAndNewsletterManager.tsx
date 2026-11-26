"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  notifyAdminDataUpdated,
  subscribeAdminDataUpdated,
} from "../../lib/adminRealtime";
import type { BlogArticle } from "../../lib/schemas";
import type {
  AutomationConfig,
  AutomationLogEntry,
  PostTypeSchedule,
  SocialPostRecord,
  TrackedComment,
} from "../../lib/automation";
import { DEFAULT_MASTER_PROMPTS } from "../../lib/prompts/masterPrompts";
import type { Subscriber } from "../../lib/controllers/newsletterController";
import { ConfirmModal } from "./ConfirmModal";

const CLIENT_DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
  enabled: false,
  scheduleMode: "days_of_week",
  daysOfWeek: [1, 4],
  intervalDays: 3,
  timeOfDay: "09:00",
  timezone: "Africa/Lagos",
  blogSchedule: {
    enabled: false,
    scheduleMode: "days_of_week",
    daysOfWeek: [1, 4], // Monday & Thursday
    intervalDays: 3,
    timeOfDay: "09:00",
  },
  linkedinSchedule: {
    enabled: false,
    scheduleMode: "days_of_week",
    daysOfWeek: [1, 2, 3, 4, 5], // Monday, Tuesday, Wednesday, Thursday, Friday
    intervalDays: 2,
    timeOfDay: "11:00",
  },
  textModel: "auto",
  imageModel: "cloudflare-flux",
  autoPublishBlog: true,
  autoPublishDevTo: true,
  autoGenerateCoverImage: true,
  autoGenerateLinkedinImage: false,
  autoSendNewsletter: true,
  autoPostLinkedin: false,
  requireSocialReviewAlert: true,
  adminAlertEmail: "akinwolejoseph01@gmail.com",
  devtoTopicsQueue: [
    "Designing Idempotent Payment Flows in React & TypeScript Financial Apps",
    "Why Most Frontend State Machines Fail at Scale (And How to Fix Them)",
  ],
  linkedinTopicsQueue: [
    "Why Idempotency Keys Are a Frontend UX Responsibility in Fintech Systems",
    "The Hidden Cost of Over-Abstracted State Management in Enterprise React",
    "How We Cut Perceived Latency by 40% Using Optimistic UI Guardrails",
    "TypeScript Discriminated Unions vs. Boolean Flags in Financial Workflows",
    "Engineering Leadership Lesson: Designing Interfaces That Fail Gracefully",
  ],
  linkedinTopicImages: {},
  topicsQueue: [
    "Designing Idempotent Payment Flows in React & TypeScript Financial Apps",
    "Why Most Frontend State Machines Fail at Scale (And How to Fix Them)",
  ],
  nicheKeywords: [
    "Frontend Architecture",
    "Financial Tooling & Fintech UX",
    "TypeScript Design Patterns",
    "React 19 & Next.js Performance",
    "Design Systems & Micro-Interactions",
  ],
  masterPrompts: DEFAULT_MASTER_PROMPTS,
};

interface AutomationAndNewsletterManagerProps {
  blogs: BlogArticle[];
  onArticleCreated: (article: BlogArticle) => void;
  showToast: (msg: string, type?: "success" | "error") => void;
}

const DAYS = [
  { id: 0, label: "SUN" },
  { id: 1, label: "MON" },
  { id: 2, label: "TUE" },
  { id: 3, label: "WED" },
  { id: 4, label: "THU" },
  { id: 5, label: "FRI" },
  { id: 6, label: "SAT" },
];

export function AutomationAndNewsletterManager({
  blogs,
  onArticleCreated,
  showToast,
}: AutomationAndNewsletterManagerProps) {
  const [subTab, setSubTab] = useState<
    "schedule" | "prompts" | "social" | "newsletter" | "logs"
  >(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const st = params.get("subTab");
      if (
        st === "social" ||
        st === "schedule" ||
        st === "prompts" ||
        st === "newsletter" ||
        st === "logs"
      ) {
        return st;
      }
      if (params.get("linkedin") || params.get("linkedinError")) {
        return "social";
      }
    }
    return "schedule";
  });

  const handleSelectSubTab = (
    nextSubTab: "schedule" | "prompts" | "social" | "newsletter" | "logs",
  ) => {
    setSubTab(nextSubTab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "automation");
      url.searchParams.set("subTab", nextSubTab);
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  };
  const [config, setConfig] = useState<AutomationConfig>(
    CLIENT_DEFAULT_AUTOMATION_CONFIG,
  );
  const [socialPosts, setSocialPosts] = useState<SocialPostRecord[]>([]);
  const [comments, setComments] = useState<TrackedComment[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [logs, setLogs] = useState<AutomationLogEntry[]>([]);
  const [logFilterPipeline, setLogFilterPipeline] = useState<string>("all");
  const [clearingLogs, setClearingLogs] = useState(false);
  const [providers, setProviders] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Run now state
  const [customRunTopic, setCustomRunTopic] = useState("");
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [runningLinkedinPipeline, setRunningLinkedinPipeline] = useState(false);
  const [newDevtoQueueTopic, setNewDevtoQueueTopic] = useState("");
  const [newLinkedinQueueTopic, setNewLinkedinQueueTopic] = useState("");
  const [newLinkedinTopicImageUrl, setNewLinkedinTopicImageUrl] = useState("");
  const [uploadingLinkedinImageKey, setUploadingLinkedinImageKey] = useState<
    string | null
  >(null);
  const [generatingQueuesTarget, setGeneratingQueuesTarget] = useState<
    "both" | "devto" | "linkedin" | null
  >(null);
  const [newKeyword, setNewKeyword] = useState("");

  // Social generator state
  const [selectedSlugForSocial, setSelectedSlugForSocial] = useState("");
  const [generatingSocial, setGeneratingSocial] = useState(false);
  const [publishingSocialId, setPublishingSocialId] = useState<string | null>(
    null,
  );
  const [syncingComments, setSyncingComments] = useState(false);

  // Separate LinkedIn & DEV.to comment composer state
  const [linkedinCommentInput, setLinkedinCommentInput] = useState({
    articleTitle: "",
    authorName: "",
    commentText: "",
  });
  const [devtoCommentInput, setDevtoCommentInput] = useState({
    articleTitle: "",
    authorName: "",
    commentText: "",
  });
  const [linkedinSyncNotice, setLinkedinSyncNotice] = useState<string | null>(
    null,
  );
  const [generatingReplyId, setGeneratingReplyId] = useState<string | null>(
    null,
  );

  // Newsletter state
  const [bulkEmailsInput, setBulkEmailsInput] = useState("");
  const [addingEmails, setAddingEmails] = useState(false);
  const [selectedSlugForBlast, setSelectedSlugForBlast] = useState("");
  const [sendingBlast, setSendingBlast] = useState(false);
  const [subscriberSearch, setSubscriberSearch] = useState("");
  const [deleteSubscriberEmail, setDeleteSubscriberEmail] = useState<
    string | null
  >(null);

  const syncingRef = useRef(false);
  const hasUnsavedConfigRef = useRef(false);
  const [draggedQueueItem, setDraggedQueueItem] = useState<{
    queue: "devto" | "linkedin";
    index: number;
  } | null>(null);
  const [dragOverQueueItem, setDragOverQueueItem] = useState<{
    queue: "devto" | "linkedin";
    index: number;
  } | null>(null);

  const updateConfigDraft = useCallback(
    (
      updater:
        | AutomationConfig
        | ((prev: AutomationConfig) => AutomationConfig),
    ) => {
      hasUnsavedConfigRef.current = true;
      setConfig(updater);
    },
    [],
  );

  const loadAll = useCallback(
    async (silent = false) => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      if (!silent) setLoading(true);
      try {
        const [autoRes, newsRes] = await Promise.all([
          fetch("/api/admin/automation", { cache: "no-store" }),
          fetch("/api/admin/newsletter", { cache: "no-store" }),
        ]);
        if (autoRes.ok) {
          const aData = await autoRes.json();
          if (aData.config && (!silent || !hasUnsavedConfigRef.current)) {
            setConfig(aData.config);
          }
          if (Array.isArray(aData.socialPosts))
            setSocialPosts(aData.socialPosts);
          if (Array.isArray(aData.comments)) setComments(aData.comments);
          if (Array.isArray(aData.logs)) setLogs(aData.logs);
          if (aData.providers) setProviders(aData.providers);
        }
        if (newsRes.ok) {
          const nData = await newsRes.json();
          if (Array.isArray(nData.subscribers))
            setSubscribers(nData.subscribers);
        }
      } catch (err) {
        if (!silent) {
          showToast(
            err instanceof Error
              ? err.message
              : "Failed to load automation data",
            "error",
          );
        }
      } finally {
        syncingRef.current = false;
        if (!silent) setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadAll(false);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        loadAll(true);
      }
    }, 15000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadAll(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    const unsubscribe = subscribeAdminDataUpdated(() => loadAll(true));
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const st = params.get("subTab");
      if (
        st === "social" ||
        st === "schedule" ||
        st === "prompts" ||
        st === "newsletter" ||
        st === "logs"
      ) {
        handleSelectSubTab(st);
      } else if (params.get("linkedin") || params.get("linkedinError")) {
        handleSelectSubTab("social");
      } else {
        handleSelectSubTab(subTab);
      }
    }
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubscribe();
    };
  }, [loadAll]);

  useEffect(() => {
    if (blogs.length > 0 && !selectedSlugForSocial) {
      setSelectedSlugForSocial(blogs[0].slug);
      setSelectedSlugForBlast(blogs[0].slug);
      setLinkedinCommentInput((prev) => ({
        ...prev,
        articleTitle: blogs[0].title,
      }));
      setDevtoCommentInput((prev) => ({
        ...prev,
        articleTitle: blogs[0].title,
      }));
    }
  }, [blogs, selectedSlugForSocial]);

  const handleSaveConfig = async (patch?: Partial<AutomationConfig>) => {
    const payload = patch ? { ...config, ...patch } : config;
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      hasUnsavedConfigRef.current = false;
      setConfig(data.config);
      notifyAdminDataUpdated("automation");
      showToast("Automation configuration saved");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save config",
        "error",
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRunAutomationNow = async () => {
    setRunningPipeline(true);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run-now",
          topic: customRunTopic.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.logs)) setLogs(data.logs);
      if (!res.ok) throw new Error(data.error || "Automation run failed");

      if (data.article) {
        onArticleCreated(data.article);
      }
      if (data.socialPost) {
        setSocialPosts((prev) => [data.socialPost, ...prev]);
      }
      if (data.config) setConfig(data.config);
      setCustomRunTopic("");
      const parts = [
        `Generated "${data.article?.title}" via ${data.modelUsed}`,
      ];
      if (data.devtoResult?.success)
        parts.push("DEV.to + Hero Featured Updated");
      if (data.newsletterResult?.success)
        parts.push(`Emailed ${data.newsletterResult.sentCount} subscribers`);
      showToast(parts.join(" · "));
      await loadAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Automation pipeline failed",
        "error",
      );
      await loadAll();
    } finally {
      setRunningPipeline(false);
    }
  };

  const handleRunLinkedinAutomationNow = async () => {
    setRunningLinkedinPipeline(true);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "run-linkedin-now",
          topic: customRunTopic.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.logs)) setLogs(data.logs);
      if (!res.ok) throw new Error(data.error || "LinkedIn automation failed");
      if (data.socialPost) {
        setSocialPosts((prev) => [data.socialPost, ...prev]);
      }
      if (data.config) setConfig(data.config);
      showToast(
        data.socialPost?.linkedinStatus === "published"
          ? `Published LinkedIn post for "${data.articleTitle}" & sent confirmation email`
          : data.socialPost?.reviewEmailSent
            ? `LinkedIn OAuth expired/unverified — emailed verification link for "${data.articleTitle}"`
            : `Generated LinkedIn post for "${data.articleTitle}" (ready for review)`,
      );
      await loadAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "LinkedIn automation failed",
        "error",
      );
      await loadAll();
    } finally {
      setRunningLinkedinPipeline(false);
    }
  };

  const getWeeklySlotCount = (sched?: PostTypeSchedule) => {
    if (!sched) return 2;
    if (sched.scheduleMode === "interval_days") {
      return Math.max(
        1,
        Math.min(7, Math.ceil(7 / Math.max(1, sched.intervalDays || 3))),
      );
    }
    return Math.max(1, Math.min(7, sched.daysOfWeek?.length || 2));
  };

  const getSlotDayLabel = (
    sched: PostTypeSchedule | undefined,
    idx: number,
  ) => {
    if (
      sched?.scheduleMode === "days_of_week" &&
      Array.isArray(sched.daysOfWeek) &&
      sched.daysOfWeek.length > 0
    ) {
      const dayId = sched.daysOfWeek[idx % sched.daysOfWeek.length];
      const dayObj = DAYS.find((d) => d.id === dayId);
      return dayObj ? dayObj.label : `D${idx + 1}`;
    }
    return `DAY #${idx + 1}`;
  };

  const handleGenerateWeeklyQueues = async (
    target: "both" | "devto" | "linkedin" = "both",
  ) => {
    setGeneratingQueuesTarget(target);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-weekly-queues",
          target,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.logs)) setLogs(data.logs);
      if (!res.ok)
        throw new Error(data.error || "Failed to generate weekly queues");
      if (data.config) {
        setConfig(data.config);
      }
      if (target === "both") {
        showToast(
          `AI generated weekly queues: ${data.devtoCount} DEV.to topic(s) + ${data.linkedinCount} LinkedIn topic(s) for week of ${data.weekKey}`,
        );
      } else if (target === "devto") {
        showToast(
          `AI generated ${data.devtoCount} DEV.to blog topic(s) for this week's schedule`,
        );
      } else {
        showToast(
          `AI generated ${data.linkedinCount} LinkedIn post topic(s) for this week's schedule`,
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Weekly queue generation failed",
        "error",
      );
    } finally {
      setGeneratingQueuesTarget(null);
    }
  };

  const updateSubSchedule = (
    type: "blogSchedule" | "linkedinSchedule",
    patch: Partial<PostTypeSchedule>,
    autoSave = false,
  ) => {
    const currentSub = config[type] || CLIENT_DEFAULT_AUTOMATION_CONFIG[type];
    const nextSub = { ...currentSub, ...patch };
    const nextPatch: Partial<AutomationConfig> = {
      [type]: nextSub,
      ...(type === "blogSchedule"
        ? {
            enabled:
              nextSub.enabled || Boolean(config.linkedinSchedule?.enabled),
            scheduleMode: nextSub.scheduleMode,
            daysOfWeek: nextSub.daysOfWeek,
            intervalDays: nextSub.intervalDays,
            timeOfDay: nextSub.timeOfDay,
          }
        : {
            enabled: Boolean(config.blogSchedule?.enabled) || nextSub.enabled,
          }),
    };
    hasUnsavedConfigRef.current = !autoSave;
    setConfig({
      ...config,
      ...nextPatch,
    });
    if (autoSave) {
      void handleSaveConfig(nextPatch);
    }
  };

  const handleGenerateSocialForBlog = async () => {
    if (!selectedSlugForSocial) return;
    setGeneratingSocial(true);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-social",
          slug: selectedSlugForSocial,
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to generate social posts");
      if (data.socialPost) {
        setSocialPosts((prev) => [data.socialPost, ...prev]);
      }
      showToast(
        data.socialPost?.reviewEmailSent
          ? `Generated LinkedIn draft + sent review alert email to ${data.socialPost.reviewEmailSentTo}`
          : "Generated official LinkedIn draft (held for your review)",
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Social generation failed",
        "error",
      );
    } finally {
      setGeneratingSocial(false);
    }
  };

  const handleSendReviewEmail = async (post: SocialPostRecord) => {
    setPublishingSocialId(`${post.id}-email`);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-review-email",
          id: post.id,
          recipientEmail: config.adminAlertEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send review email");
      }
      setSocialPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, reviewEmailSent: true, reviewEmailSentTo: data.sentTo }
            : p,
        ),
      );
      showToast(`Sent LinkedIn review email to ${data.sentTo}`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Review email failed",
        "error",
      );
    } finally {
      setPublishingSocialId(null);
    }
  };

  const handleUploadLinkedinQueueImage = async (
    file: File,
    targetTopicOrNew: string,
  ) => {
    setUploadingLinkedinImageKey(targetTopicOrNew);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "portfolio/linkedin");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image to Cloudinary");
      }

      if (targetTopicOrNew === "__new__") {
        setNewLinkedinTopicImageUrl(data.url);
        showToast(
          "Uploaded LinkedIn image to Cloudinary (will attach when you add the topic)",
        );
      } else {
        const nextImages = {
          ...(config.linkedinTopicImages || {}),
          [targetTopicOrNew]: data.url,
        };
        setConfig((prev) => ({
          ...prev,
          linkedinTopicImages: nextImages,
        }));
        await handleSaveConfig({ linkedinTopicImages: nextImages });
        showToast(
          "Uploaded authentic image to Cloudinary & attached to LinkedIn queue topic",
        );
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Cloudinary image upload failed",
        "error",
      );
    } finally {
      setUploadingLinkedinImageKey(null);
    }
  };

  const handleRemoveLinkedinQueueImage = async (topic: string) => {
    const nextImages = { ...(config.linkedinTopicImages || {}) };
    delete nextImages[topic];
    setConfig((prev) => ({
      ...prev,
      linkedinTopicImages: nextImages,
    }));
    await handleSaveConfig({ linkedinTopicImages: nextImages });
    showToast(
      "Removed attached image from LinkedIn topic (will post as text-only)",
    );
  };

  const handleUploadSocialPostImage = async (file: File, postId: string) => {
    setUploadingLinkedinImageKey(`post-${postId}`);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "portfolio/linkedin");

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Failed to upload image to Cloudinary");
      }

      await handleUpdateSocialRecord(postId, { linkedinImageUrl: data.url });
      showToast("Attached authentic Cloudinary image to LinkedIn draft");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Image upload failed",
        "error",
      );
    } finally {
      setUploadingLinkedinImageKey(null);
    }
  };

  const handlePublishSocialApi = async (
    post: SocialPostRecord,
    platform: "linkedin",
  ) => {
    setPublishingSocialId(`${post.id}-${platform}`);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish-social",
          id: post.id,
          platform,
          text: post.linkedinContent,
          imageUrl: post.linkedinImageUrl,
          articleUrl: post.articleUrl,
          title: post.articleTitle,
        }),
      });
      const data = await res.json();
      if (data.needsOAuth && platform === "linkedin") {
        showToast(
          "Redirecting to LinkedIn OAuth verification to authorize and publish…",
        );
        window.location.href = `/api/auth/linkedin?postId=${encodeURIComponent(post.id)}&autoPublish=true`;
        return;
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Direct API publish unavailable");
      }
      showToast(`Published directly to ${platform.toUpperCase()}`);
      await loadAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "API publish failed",
        "error",
      );
    } finally {
      setPublishingSocialId(null);
    }
  };

  const handleUpdateSocialRecord = async (
    id: string,
    patch: Partial<SocialPostRecord>,
  ) => {
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-social",
          id,
          patch,
        }),
      });
      if (res.ok) {
        setSocialPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        );
        showToast("Saved social post edits");
      }
    } catch {
      showToast("Failed to update social post", "error");
    }
  };

  const handleSyncComments = async () => {
    setSyncingComments(true);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-comments" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Comment sync failed");
      if (Array.isArray(data.comments)) setComments(data.comments);
      setLinkedinSyncNotice(data.linkedinSyncNote || null);
      showToast(
        `Synced ${data.syncedArticles || 0} DEV.to article(s)${
          data.syncedLinkedinPosts
            ? ` & ${data.syncedLinkedinPosts} LinkedIn post(s)`
            : ""
        }`,
      );
      await loadAll();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Comment sync failed",
        "error",
      );
    } finally {
      setSyncingComments(false);
    }
  };

  const handleAddAndReplyComment = async (platform: "linkedin" | "devto") => {
    const inputState =
      platform === "linkedin" ? linkedinCommentInput : devtoCommentInput;
    if (!inputState.commentText.trim()) {
      showToast(
        `Paste or enter a ${platform.toUpperCase()} comment first`,
        "error",
      );
      return;
    }
    setGeneratingReplyId(`new-${platform}`);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-comment",
          platform,
          articleSlug: selectedSlugForSocial || "general",
          articleTitle: inputState.articleTitle || "Engineering Article",
          authorName: inputState.authorName || "Commenter",
          commentText: inputState.commentText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reply generation failed");
      if (data.comment) {
        setComments((prev) => [data.comment, ...prev]);
      }
      if (platform === "linkedin") {
        setLinkedinCommentInput((prev) => ({
          ...prev,
          authorName: "",
          commentText: "",
        }));
      } else {
        setDevtoCommentInput((prev) => ({
          ...prev,
          authorName: "",
          commentText: "",
        }));
      }
      showToast(`Generated tailored ${platform.toUpperCase()} reply`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Reply generation failed",
        "error",
      );
    } finally {
      setGeneratingReplyId(null);
    }
  };

  const handleRegenerateReply = async (c: TrackedComment) => {
    setGeneratingReplyId(c.id);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply-comment",
          commentId: c.id,
          platform: c.platform,
          articleTitle: c.articleTitle,
          authorName: c.authorName,
          commentText: c.commentText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate reply");
      setComments((prev) =>
        prev.map((item) =>
          item.id === c.id
            ? { ...item, aiSuggestedReply: data.reply, status: "replied" }
            : item,
        ),
      );
      showToast(`Crafted ${c.platform.toUpperCase()} reply`);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to generate reply",
        "error",
      );
    } finally {
      setGeneratingReplyId(null);
    }
  };

  const handleAddSubscribersFromAdmin = async () => {
    if (!bulkEmailsInput.trim()) return;
    setAddingEmails(true);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: bulkEmailsInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add emails");
      if (Array.isArray(data.subscribers)) setSubscribers(data.subscribers);
      setBulkEmailsInput("");
      showToast(
        `Added ${data.added} subscriber email(s) (Total: ${data.total})`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to add subscribers",
        "error",
      );
    } finally {
      setAddingEmails(false);
    }
  };

  const handleSendNewsletterBlast = async () => {
    if (!selectedSlugForBlast) return;
    setSendingBlast(true);
    try {
      const res = await fetch("/api/admin/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-article",
          slug: selectedSlugForBlast,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Newsletter send failed");
      }
      showToast(
        `Sent article to ${data.sentCount} subscriber(s) via ${data.provider.toUpperCase()}`,
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Newsletter send failed",
        "error",
      );
    } finally {
      setSendingBlast(false);
    }
  };

  const handleConfirmDeleteSubscriber = async () => {
    if (!deleteSubscriberEmail) return;
    const email = deleteSubscriberEmail;
    setDeleteSubscriberEmail(null);
    try {
      const res = await fetch(
        `/api/admin/newsletter?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove subscriber");
      if (Array.isArray(data.subscribers)) setSubscribers(data.subscribers);
      showToast(`Removed ${email} from newsletter list`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Remove failed", "error");
    }
  };

  const handleClearLogs = async () => {
    setClearingLogs(true);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-logs" }),
      });
      if (res.ok) {
        setLogs([]);
        showToast("Cleared automation debug logs");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to clear logs",
        "error",
      );
    } finally {
      setClearingLogs(false);
    }
  };

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(subscriberSearch.trim().toLowerCase()),
  );

  const filteredLogs = logs.filter((l) =>
    logFilterPipeline === "all" ? true : l.pipeline === logFilterPipeline,
  );

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-medium tracking-tight text-paper">
            AI Blog Automation, LinkedIn Studio &amp; Newsletter
          </h2>
          <p className="text-xs text-[#8e8883] font-mono mt-1">
            Schedule automated articles · Free AI models &amp; Flux images ·
            Tailored LinkedIn master prompts · Newsletter subscribers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "schedule", label: "AUTOMATION & SCHEDULE" },
            { id: "prompts", label: "MASTER PROMPTS (LINKEDIN / BLOG)" },
            {
              id: "social",
              label: `LINKEDIN & COMMENTS (${socialPosts.length})`,
            },
            { id: "newsletter", label: `NEWSLETTER (${subscribers.length})` },
            { id: "logs", label: `DEBUG LOGS (${logs.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl font-mono text-[9px] tracking-[0.08em] transition-all cursor-pointer ${
                subTab === t.id
                  ? "bg-white text-[#09090b] font-bold shadow"
                  : "bg-white/[0.04] text-[#999] border border-white/10 hover:text-paper"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 1: AUTOMATION PIPELINE & SCHEDULE
      ════════════════════════════════════════════════════════════════ */}
      {subTab === "schedule" && (
        <div className="space-y-6">
          {/* Instant Trigger Card */}
          <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[8px] text-zinc-200 uppercase tracking-[0.14em] font-bold">
                  ONE-CLICK END-TO-END PIPELINE
                </span>
                <h3 className="text-base font-medium text-paper mt-1">
                  Generate Blog + Free AI Cover Image + DEV.to + LinkedIn Post +
                  Newsletter
                </h3>
              </div>
              {config.lastRunAt && (
                <span className="font-mono text-[8px] text-[#aaa] px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                  LAST RUN: {new Date(config.lastRunAt).toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex max-sm:flex-col gap-3">
              <input
                type="text"
                value={customRunTopic}
                onChange={(e) => setCustomRunTopic(e.target.value)}
                placeholder="Optional custom topic (leave blank to auto-pick next topic from queue)…"
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
              />
              <button
                type="button"
                onClick={handleRunAutomationNow}
                disabled={runningPipeline}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[10px] font-bold tracking-[0.08em] cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-lg"
              >
                {runningPipeline
                  ? "RUNNING BLOG PIPELINE…"
                  : "RUN BLOG AUTOMATION NOW"}
              </button>
              <button
                type="button"
                onClick={handleRunLinkedinAutomationNow}
                disabled={runningLinkedinPipeline}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[10px] font-bold tracking-[0.08em] cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-lg"
              >
                {runningLinkedinPipeline
                  ? "RUNNING LINKEDIN…"
                  : "in RUN LINKEDIN AUTOMATION NOW"}
              </button>
            </div>

            {/* Free Models Status Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="font-mono text-[8px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                ● AI-ENGINE LOOP:{" "}
                {providers?.geminiConfigured
                  ? "GEMINI 2.0 FLASH"
                  : "GEMINI (NO KEY)"}{" "}
                →{" "}
                {providers?.cloudflareWorkersAiConfigured
                  ? "CLOUDFLARE WORKERS AI"
                  : "WORKERS AI (ADD KEY)"}{" "}
                → POLLINATIONS FREE
              </span>
              <span className="font-mono text-[8px] px-2.5 py-0.5 rounded-full border border-sky-500/40 text-zinc-200 bg-sky-500/10">
                ● FREE IMAGE AI: CLOUDFLARE FLUX.1 / SDXL → CLOUDINARY → DEV.TO
              </span>
              <span className="font-mono text-[8px] px-2.5 py-0.5 rounded-full border border-purple-500/40 text-purple-300 bg-purple-500/10">
                ● EMAIL:{" "}
                {providers?.email?.activeProvider?.toUpperCase() ||
                  "CONFIGURE GMAIL/RESEND"}
              </span>
            </div>
          </div>

          {/* Schedule & Cadence Configuration (Individual Schedules per Post Type) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-medium text-paper">
                    Individual Post-Type Schedules
                  </h3>
                  <p className="font-mono text-[9px] text-[#777] mt-0.5">
                    Set the exact days (Mon, Tue, Wed, Thu, Fri, etc.) and time
                    individually for Blog Posts vs. LinkedIn Posts.
                  </p>
                </div>
                <select
                  value={config.timezone}
                  onChange={(e) =>
                    setConfig({ ...config, timezone: e.target.value })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[10px] text-paper font-mono focus:border-white/25 outline-none"
                >
                  <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>

              {/* ── 1. BLOG POST SCHEDULE CARD ── */}
              {(() => {
                const blogSched =
                  config.blogSchedule ||
                  CLIENT_DEFAULT_AUTOMATION_CONFIG.blogSchedule;
                return (
                  <div className="p-4 rounded-xl bg-[#161513] border border-ember/30 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-wider">
                          1. BLOG POST SCHEDULE (DEV.TO + HERO + NEWSLETTER)
                        </span>
                        {blogSched.lastRunAt && (
                          <p className="font-mono text-[8px] text-[#777] mt-0.5">
                            Last run:{" "}
                            {new Date(blogSched.lastRunAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(blogSched.enabled)}
                        onClick={() =>
                          updateSubSchedule(
                            "blogSchedule",
                            {
                              enabled: !blogSched.enabled,
                            },
                            true
                          )
                        }
                        className="inline-flex items-center gap-2.5 cursor-pointer group"
                        title={
                          blogSched.enabled
                            ? "Schedule is ACTIVE. Click to pause."
                            : "Schedule is PAUSED. Click to activate."
                        }
                      >
                        <span
                          className={`font-mono text-[9px] font-bold tracking-wider ${
                            blogSched.enabled
                              ? "text-emerald-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {blogSched.enabled ? "ACTIVE" : "PAUSED"}
                        </span>
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                            blogSched.enabled
                              ? "bg-emerald-500/80 border-emerald-400"
                              : "bg-white/10 border-white/20"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              blogSched.enabled
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    {/* Mode & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                          Schedule Mode
                        </label>
                        <select
                          value={blogSched.scheduleMode}
                          onChange={(e) =>
                            updateSubSchedule("blogSchedule", {
                              scheduleMode: e.target.value as
                                | "days_of_week"
                                | "interval_days",
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono"
                        >
                          <option value="days_of_week">
                            Specific Days of Week (Mon–Sun)
                          </option>
                          <option value="interval_days">
                            Every N Days (Interval)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                          Blog Publish Time (24h)
                        </label>
                        <input
                          type="time"
                          value={blogSched.timeOfDay}
                          onChange={(e) =>
                            updateSubSchedule("blogSchedule", {
                              timeOfDay: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono"
                        />
                      </div>
                    </div>

                    {blogSched.scheduleMode === "days_of_week" ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-mono text-[8px] text-[#888] uppercase">
                            Select Blog Days:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateSubSchedule("blogSchedule", {
                                  daysOfWeek: [1, 2, 3, 4, 5],
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[7px] text-[#bbb] cursor-pointer"
                            >
                              MON–FRI
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSubSchedule("blogSchedule", {
                                  daysOfWeek: [1, 3, 5],
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[7px] text-[#bbb] cursor-pointer"
                            >
                              MON/WED/FRI
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSubSchedule("blogSchedule", {
                                  daysOfWeek: [1, 4],
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[7px] text-[#bbb] cursor-pointer"
                            >
                              MON &amp; THU
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map((d) => {
                            const active = blogSched.daysOfWeek.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  const next = active
                                    ? blogSched.daysOfWeek.filter(
                                        (x) => x !== d.id,
                                      )
                                    : [...blogSched.daysOfWeek, d.id].sort();
                                  updateSubSchedule("blogSchedule", {
                                    daysOfWeek: next,
                                  });
                                }}
                                className={`px-2.5 py-1.5 rounded-lg font-mono text-[9px] border cursor-pointer transition-colors ${
                                  active
                                    ? "bg-white text-[#09090b] border-ember font-bold"
                                    : "bg-white/[0.04] text-[#888] border-white/10 hover:text-paper"
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-[#aaa]">
                          Run every
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={blogSched.intervalDays}
                          onChange={(e) =>
                            updateSubSchedule("blogSchedule", {
                              intervalDays: Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1,
                              ),
                            })
                          }
                          className="w-16 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono"
                        />
                        <span className="font-mono text-[9px] text-[#aaa]">
                          day(s) at{" "}
                          <strong className="text-zinc-200">
                            {blogSched.timeOfDay}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── 2. LINKEDIN POST SCHEDULE CARD ── */}
              {(() => {
                const liSched =
                  config.linkedinSchedule ||
                  CLIENT_DEFAULT_AUTOMATION_CONFIG.linkedinSchedule;
                return (
                  <div className="p-4 rounded-xl bg-[#161513] border border-sky-500/30 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-wider">
                          in 2. LINKEDIN POST SCHEDULE (PRE-POST REVIEW EMAIL +
                          OAUTH)
                        </span>
                        {liSched.lastRunAt && (
                          <p className="font-mono text-[8px] text-[#777] mt-0.5">
                            Last run:{" "}
                            {new Date(liSched.lastRunAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(liSched.enabled)}
                        onClick={() =>
                          updateSubSchedule(
                            "linkedinSchedule",
                            {
                              enabled: !liSched.enabled,
                            },
                            true
                          )
                        }
                        className="inline-flex items-center gap-2.5 cursor-pointer group"
                        title={
                          liSched.enabled
                            ? "Schedule is ACTIVE. Click to pause."
                            : "Schedule is PAUSED. Click to activate."
                        }
                      >
                        <span
                          className={`font-mono text-[9px] font-bold tracking-wider ${
                            liSched.enabled
                              ? "text-emerald-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {liSched.enabled ? "ACTIVE" : "PAUSED"}
                        </span>
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                            liSched.enabled
                              ? "bg-emerald-500/80 border-emerald-400"
                              : "bg-white/10 border-white/20"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              liSched.enabled
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    </div>

                    {/* Mode & Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                          Schedule Mode
                        </label>
                        <select
                          value={liSched.scheduleMode}
                          onChange={(e) =>
                            updateSubSchedule("linkedinSchedule", {
                              scheduleMode: e.target.value as
                                | "days_of_week"
                                | "interval_days",
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono"
                        >
                          <option value="days_of_week">
                            Specific Days of Week (Mon–Sun)
                          </option>
                          <option value="interval_days">
                            Every N Days (Interval)
                          </option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                          LinkedIn Draft &amp; Alert Time (24h)
                        </label>
                        <input
                          type="time"
                          value={liSched.timeOfDay}
                          onChange={(e) =>
                            updateSubSchedule("linkedinSchedule", {
                              timeOfDay: e.target.value,
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono"
                        />
                      </div>
                    </div>

                    {liSched.scheduleMode === "days_of_week" ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="font-mono text-[8px] text-[#888] uppercase">
                            Select LinkedIn Days:
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateSubSchedule("linkedinSchedule", {
                                  daysOfWeek: [1, 2, 3, 4, 5],
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[7px] text-[#bbb] cursor-pointer"
                            >
                              MON–FRI
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSubSchedule("linkedinSchedule", {
                                  daysOfWeek: [1, 3, 5],
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[7px] text-[#bbb] cursor-pointer"
                            >
                              MON/WED/FRI
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateSubSchedule("linkedinSchedule", {
                                  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                                })
                              }
                              className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 font-mono text-[7px] text-[#bbb] cursor-pointer"
                            >
                              DAILY
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map((d) => {
                            const active = liSched.daysOfWeek.includes(d.id);
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  const next = active
                                    ? liSched.daysOfWeek.filter(
                                        (x) => x !== d.id,
                                      )
                                    : [...liSched.daysOfWeek, d.id].sort();
                                  updateSubSchedule("linkedinSchedule", {
                                    daysOfWeek: next,
                                  });
                                }}
                                className={`px-2.5 py-1.5 rounded-lg font-mono text-[9px] border cursor-pointer transition-colors ${
                                  active
                                    ? "bg-white text-[#09090b] border-sky-400 font-bold"
                                    : "bg-white/[0.04] text-[#888] border-white/10 hover:text-paper"
                                }`}
                              >
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-[#aaa]">
                          Run every
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={liSched.intervalDays}
                          onChange={(e) =>
                            updateSubSchedule("linkedinSchedule", {
                              intervalDays: Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1,
                              ),
                            })
                          }
                          className="w-16 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono"
                        />
                        <span className="font-mono text-[9px] text-[#aaa]">
                          day(s) at{" "}
                          <strong className="text-zinc-200">
                            {liSched.timeOfDay}
                          </strong>
                        </span>
                      </div>
                    )}

                    {/* Optional AI Image Generation Switch for LinkedIn Posts */}
                    <div className="pt-3 mt-1 border-t border-white/10 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="block font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-wider">
                          Auto-Generate Image for LinkedIn Posts
                        </span>
                        <span className="block font-mono text-[8px] text-[#777] mt-0.5">
                          Generates &amp; attaches a free AI image when no manual image is attached (manual attachment overrides this).
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(config.autoGenerateLinkedinImage)}
                        onClick={() => {
                          const nextVal = !config.autoGenerateLinkedinImage;
                          updateConfigDraft({
                            ...config,
                            autoGenerateLinkedinImage: nextVal,
                          });
                          void handleSaveConfig({
                            autoGenerateLinkedinImage: nextVal,
                          });
                        }}
                        className="inline-flex items-center gap-2 shrink-0 cursor-pointer"
                      >
                        <span
                          className={`font-mono text-[9px] font-bold tracking-wider ${
                            config.autoGenerateLinkedinImage
                              ? "text-emerald-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {config.autoGenerateLinkedinImage ? "ON" : "OFF"}
                        </span>
                        <span
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors ${
                            config.autoGenerateLinkedinImage
                              ? "bg-emerald-500/80 border-emerald-400"
                              : "bg-white/10 border-white/20"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              config.autoGenerateLinkedinImage
                                ? "translate-x-4"
                                : "translate-x-0.5"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* AI Model Selection */}
              <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3 pt-2 border-t border-white/10">
                <div>
                  <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                    Free AI Text Model
                  </label>
                  <select
                    value={config.textModel}
                    onChange={(e) =>
                      setConfig({ ...config, textModel: e.target.value as any })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono focus:border-white/25 outline-none"
                  >
                    <option value="auto">
                      Auto AI-Engine Loop (Gemini 2.0 Flash → Cloudflare Workers
                      AI → Pollinations Free)
                    </option>
                    <option value="gemini-2.0-flash">
                      Google Gemini 2.0 Flash (Free Tier)
                    </option>
                    <option value="cloudflare-workers-ai">
                      Cloudflare Workers AI (Llama 3.3 70B Instruct Free Tier)
                    </option>
                    <option value="pollinations-free">
                      Pollinations OpenAI (100% Free, No API Key)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[8px] text-[#888] uppercase mb-1">
                    Free AI Cover Image Model
                  </label>
                  <select
                    value={config.imageModel}
                    onChange={(e) =>
                      updateConfigDraft({
                        ...config,
                        imageModel: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono focus:border-white/25 outline-none"
                  >
                    <option value="cloudflare-flux">
                      Cloudflare Workers AI — Flux.1 Schnell (Free → Cloudinary)
                    </option>
                    <option value="cloudflare-sdxl">
                      Cloudflare Workers AI — SDXL Lightning (Fast Free → Cloudinary)
                    </option>
                    <option value="pollinations-flux">
                      Pollinations Flux (Fallback Free)
                    </option>
                    <option value="pollinations-turbo">
                      Pollinations SDXL Turbo (Fallback Free)
                    </option>
                  </select>
                </div>
              </div>

              {/* Pipeline Action Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="block font-mono text-[8px] text-[#888] uppercase">
                  Automated Pipeline Actions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: "autoPublishBlog",
                      label: "Publish Live (uncheck for Draft)",
                    },
                    {
                      key: "autoPublishDevTo",
                      label: "Cross-post & Sync Cover to DEV.to",
                    },
                    {
                      key: "autoGenerateCoverImage",
                      label: "Generate Free AI Cover → Cloudinary",
                    },
                    {
                      key: "autoSendNewsletter",
                      label: "Email Newsletter Subscribers",
                    },
                    {
                      key: "autoPostLinkedin",
                      label: "Generate Official LinkedIn Draft",
                    },
                    {
                      key: "requireSocialReviewAlert",
                      label:
                        "Hold LinkedIn Draft & Email Me to Review Before Posting",
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean((config as any)[item.key])}
                        onChange={(e) =>
                          setConfig({ ...config, [item.key]: e.target.checked })
                        }
                        className="accent-ember"
                      />
                      <span className="font-mono text-[9px] text-[#ccc]">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Admin Review Alert Email Input */}
                <div className="pt-2">
                  <label className="block font-mono text-[8px] text-zinc-200 uppercase mb-1 font-bold">
                    Admin Review Alert Email (Receives LinkedIn Draft +
                    Reputation Check Before Posting)
                  </label>
                  <input
                    type="email"
                    value={config.adminAlertEmail || ""}
                    onChange={(e) =>
                      setConfig({ ...config, adminAlertEmail: e.target.value })
                    }
                    placeholder="you@gmail.com"
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-ember/30 text-xs text-paper font-mono focus:border-white/25 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold tracking-[0.08em] cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? "SAVING…" : "SAVE SCHEDULE & SETTINGS"}
                </button>
              </div>
            </div>

            {/* Weekly AI Queues (Separate DEV.to Blog Queue & LinkedIn Queue) & Niche Pillars */}
            <div className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Weekly Cycle Auto-Generation Header */}
                <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/12 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-[8px] text-zinc-200 uppercase tracking-[0.12em] font-bold">
                        WEEKLY AI QUEUE CYCLE
                      </span>
                      <h3 className="text-sm font-medium text-paper mt-0.5">
                        Separate Weekly Queues for DEV.to Blog &amp; LinkedIn
                      </h3>
                    </div>
                    {config.lastWeeklyQueueGeneratedWeek && (
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[8px] text-[#bbb]">
                        WEEK OF {config.lastWeeklyQueueGeneratedWeek}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[8px] text-[#888] leading-relaxed">
                    At the start of each week, AI auto-generates both queues
                    below sized to the exact number of posting days you
                    scheduled ({getWeeklySlotCount(config.blogSchedule)} DEV.to
                    day(s)/wk &amp;{" "}
                    {getWeeklySlotCount(config.linkedinSchedule)} LinkedIn
                    day(s)/wk). Once all cues for the week are fulfilled, the
                    cycle auto-generates the next week&apos;s queues.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleGenerateWeeklyQueues("both")}
                      disabled={generatingQueuesTarget !== null}
                      className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {generatingQueuesTarget === "both"
                        ? "AI GENERATING WEEKLY QUEUES…"
                        : `AI GENERATE THIS WEEK'S QUEUES (${getWeeklySlotCount(config.blogSchedule)} DEV.TO + ${getWeeklySlotCount(config.linkedinSchedule)} LINKEDIN)`}
                    </button>
                  </div>
                </div>

                {/* 1. DEV.to & Portfolio Blog Weekly Queue */}
                {(() => {
                  const devtoQueue =
                    config.devtoTopicsQueue || config.topicsQueue || [];
                  const devtoSlots = getWeeklySlotCount(config.blogSchedule);
                  return (
                    <div className="p-4 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-[0.08em]">
                              DEV.TO &amp; PORTFOLIO BLOG QUEUE
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-ember/15 text-zinc-200 border border-ember/30 font-mono text-[8px] font-bold">
                              {devtoQueue.length} / {devtoSlots} DAYS THIS WEEK
                            </span>
                          </div>
                          <p className="font-mono text-[8px] text-[#888] mt-0.5">
                            Popped on each scheduled DEV.to Blog day.
                            Auto-refills ({devtoSlots} topics) at start of week.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGenerateWeeklyQueues("devto")}
                          disabled={generatingQueuesTarget !== null}
                          className="px-2.5 py-1 rounded-lg bg-ember/20 hover:bg-ember/30 border border-white/[0.12] text-zinc-200 font-mono text-[8px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {generatingQueuesTarget === "devto"
                            ? "GENERATING…"
                            : `AI FILL DEV.TO WEEK (${devtoSlots})`}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDevtoQueueTopic}
                          onChange={(e) =>
                            setNewDevtoQueueTopic(e.target.value)
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              newDevtoQueueTopic.trim()
                            ) {
                              e.preventDefault();
                              const next = [
                                ...devtoQueue,
                                newDevtoQueueTopic.trim(),
                              ];
                              updateConfigDraft({
                                ...config,
                                devtoTopicsQueue: next,
                                topicsQueue: next,
                              });
                              setNewDevtoQueueTopic("");
                              void handleSaveConfig({
                                devtoTopicsQueue: next,
                                topicsQueue: next,
                              });
                            }
                          }}
                          placeholder="Add a custom DEV.to blog topic to this week's queue…"
                          className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newDevtoQueueTopic.trim()) return;
                            const next = [
                              ...devtoQueue,
                              newDevtoQueueTopic.trim(),
                            ];
                            updateConfigDraft({
                              ...config,
                              devtoTopicsQueue: next,
                              topicsQueue: next,
                            });
                            setNewDevtoQueueTopic("");
                            void handleSaveConfig({
                              devtoTopicsQueue: next,
                              topicsQueue: next,
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/[0.1] font-mono text-[9px] text-paper cursor-pointer"
                        >
                          + DEV.TO
                        </button>
                      </div>

                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {devtoQueue.map((topic, idx) => {
                          const isDragTarget =
                            dragOverQueueItem?.queue === "devto" &&
                            dragOverQueueItem.index === idx;
                          return (
                            <div
                              key={`${topic}-${idx}`}
                              draggable
                              onDragStart={() =>
                                setDraggedQueueItem({
                                  queue: "devto",
                                  index: idx,
                                })
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (
                                  draggedQueueItem?.queue === "devto" &&
                                  dragOverQueueItem?.index !== idx
                                ) {
                                  setDragOverQueueItem({
                                    queue: "devto",
                                    index: idx,
                                  });
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (
                                  draggedQueueItem?.queue === "devto" &&
                                  draggedQueueItem.index !== idx
                                ) {
                                  const next = [...devtoQueue];
                                  const [moved] = next.splice(
                                    draggedQueueItem.index,
                                    1,
                                  );
                                  next.splice(idx, 0, moved);
                                  updateConfigDraft({
                                    ...config,
                                    devtoTopicsQueue: next,
                                    topicsQueue: next,
                                  });
                                  void handleSaveConfig({
                                    devtoTopicsQueue: next,
                                    topicsQueue: next,
                                  });
                                }
                                setDraggedQueueItem(null);
                                setDragOverQueueItem(null);
                              }}
                              onDragEnd={() => {
                                setDraggedQueueItem(null);
                                setDragOverQueueItem(null);
                              }}
                              className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border transition-colors cursor-grab active:cursor-grabbing ${
                                isDragTarget
                                  ? "bg-[#f36d45]/10 border-[#f36d45]"
                                  : "bg-white/[0.04] border-white/10"
                              }`}
                            >
                              <span
                                className="text-zinc-500 font-mono text-[10px] select-none shrink-0"
                                title="Drag to reorder"
                              >
                                ⋮⋮
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-ember/15 text-zinc-200 font-mono text-[8px] font-bold shrink-0">
                                {getSlotDayLabel(config.blogSchedule, idx)}
                              </span>
                              <span className="flex-1 text-xs text-paper truncate">
                                {topic}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = devtoQueue.filter(
                                    (_, i) => i !== idx,
                                  );
                                  updateConfigDraft({
                                    ...config,
                                    devtoTopicsQueue: next,
                                    topicsQueue: next,
                                  });
                                  void handleSaveConfig({
                                    devtoTopicsQueue: next,
                                    topicsQueue: next,
                                  });
                                }}
                                className="text-red-400 font-mono text-xs hover:underline cursor-pointer px-1"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        {devtoQueue.length === 0 && (
                          <p className="font-mono text-[9px] text-[#666] py-2 text-center">
                            All DEV.to cues fulfilled — AI will auto-generate{" "}
                            {devtoSlots} new topic(s) for the next cycle.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. LinkedIn Post Weekly Queue */}
                {(() => {
                  const linkedinQueue = config.linkedinTopicsQueue || [];
                  const linkedinSlots = getWeeklySlotCount(
                    config.linkedinSchedule,
                  );
                  const topicImages = config.linkedinTopicImages || {};

                  const addNewLinkedinTopicWithOptionalImage = () => {
                    const trimmed = newLinkedinQueueTopic.trim();
                    if (!trimmed) return;
                    const nextQueue = [...linkedinQueue, trimmed];
                    const nextImages = { ...topicImages };
                    if (newLinkedinTopicImageUrl) {
                      nextImages[trimmed] = newLinkedinTopicImageUrl;
                    }
                    updateConfigDraft({
                      ...config,
                      linkedinTopicsQueue: nextQueue,
                      linkedinTopicImages: nextImages,
                    });
                    setNewLinkedinQueueTopic("");
                    setNewLinkedinTopicImageUrl("");
                    void handleSaveConfig({
                      linkedinTopicsQueue: nextQueue,
                      linkedinTopicImages: nextImages,
                    });
                  };

                  return (
                    <div className="p-4 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-[0.08em]">
                              in LINKEDIN POST WEEKLY QUEUE
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-zinc-300 border border-sky-500/30 font-mono text-[8px] font-bold">
                              {linkedinQueue.length} / {linkedinSlots} DAYS THIS
                              WEEK
                            </span>
                          </div>
                          <p className="font-mono text-[8px] text-[#888] mt-0.5">
                            Attach an authentic image (uploaded to Cloudinary)
                            to any queued topic below. If no image is attached,
                            LinkedIn posts without an image (never
                            AI-generated).
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleGenerateWeeklyQueues("linkedin")}
                          disabled={generatingQueuesTarget !== null}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-zinc-300 font-mono text-[8px] font-bold cursor-pointer disabled:opacity-50"
                        >
                          {generatingQueuesTarget === "linkedin"
                            ? "GENERATING…"
                            : `AI FILL LINKEDIN WEEK (${linkedinSlots})`}
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex max-sm:flex-col gap-2">
                          <input
                            type="text"
                            value={newLinkedinQueueTopic}
                            onChange={(e) =>
                              setNewLinkedinQueueTopic(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                newLinkedinQueueTopic.trim()
                              ) {
                                e.preventDefault();
                                addNewLinkedinTopicWithOptionalImage();
                              }
                            }}
                            placeholder="Add a custom LinkedIn topic to this week's queue…"
                            className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                          />
                          <label className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 font-mono text-[8px] text-zinc-300 font-bold cursor-pointer flex items-center gap-1 whitespace-nowrap">
                            {uploadingLinkedinImageKey === "__new__"
                              ? "UPLOADING…"
                              : newLinkedinTopicImageUrl
                                ? "IMAGE READY"
                                : "ATTACH IMAGE"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingLinkedinImageKey !== null}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file)
                                  handleUploadLinkedinQueueImage(
                                    file,
                                    "__new__",
                                  );
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={addNewLinkedinTopicWithOptionalImage}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/[0.1] font-mono text-[9px] text-paper cursor-pointer"
                          >
                            + LINKEDIN
                          </button>
                        </div>
                        {newLinkedinTopicImageUrl && (
                          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/40 border border-sky-500/30">
                            <img
                              src={newLinkedinTopicImageUrl}
                              alt="Pending LinkedIn Topic Attachment"
                              className="w-7 h-7 rounded object-cover border border-white/[0.1]"
                            />
                            <span className="font-mono text-[8px] text-emerald-400 flex-1 truncate">
                              Cloudinary image ready to attach to new topic
                            </span>
                            <button
                              type="button"
                              onClick={() => setNewLinkedinTopicImageUrl("")}
                              className="font-mono text-[8px] text-red-400 hover:underline cursor-pointer"
                            >
                              REMOVE
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {linkedinQueue.map((topic, idx) => {
                          const attachedImg = topicImages[topic];
                          const isUploadingThis =
                            uploadingLinkedinImageKey === topic;
                          const isDragTarget =
                            dragOverQueueItem?.queue === "linkedin" &&
                            dragOverQueueItem.index === idx;
                          return (
                            <div
                              key={`${topic}-${idx}`}
                              draggable
                              onDragStart={() =>
                                setDraggedQueueItem({
                                  queue: "linkedin",
                                  index: idx,
                                })
                              }
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (
                                  draggedQueueItem?.queue === "linkedin" &&
                                  dragOverQueueItem?.index !== idx
                                ) {
                                  setDragOverQueueItem({
                                    queue: "linkedin",
                                    index: idx,
                                  });
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (
                                  draggedQueueItem?.queue === "linkedin" &&
                                  draggedQueueItem.index !== idx
                                ) {
                                  const nextQueue = [...linkedinQueue];
                                  const [moved] = nextQueue.splice(
                                    draggedQueueItem.index,
                                    1,
                                  );
                                  nextQueue.splice(idx, 0, moved);
                                  updateConfigDraft({
                                    ...config,
                                    linkedinTopicsQueue: nextQueue,
                                  });
                                  void handleSaveConfig({
                                    linkedinTopicsQueue: nextQueue,
                                  });
                                }
                                setDraggedQueueItem(null);
                                setDragOverQueueItem(null);
                              }}
                              onDragEnd={() => {
                                setDraggedQueueItem(null);
                                setDragOverQueueItem(null);
                              }}
                              className={`p-2.5 rounded-xl border space-y-2 transition-colors cursor-grab active:cursor-grabbing ${
                                isDragTarget
                                  ? "bg-[#f36d45]/10 border-[#f36d45]"
                                  : "bg-white/[0.04] border-white/10"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="text-zinc-500 font-mono text-[10px] select-none shrink-0"
                                  title="Drag to reorder"
                                >
                                  ⋮⋮
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-zinc-300 font-mono text-[8px] font-bold shrink-0">
                                  {getSlotDayLabel(
                                    config.linkedinSchedule,
                                    idx,
                                  )}
                                </span>
                                <span className="flex-1 text-xs text-paper truncate">
                                  {topic}
                                </span>
                                <label
                                  className="px-2 py-0.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 font-mono text-[8px] text-zinc-300 cursor-pointer shrink-0"
                                  title="Upload an authentic image to Cloudinary and attach it to this LinkedIn topic"
                                >
                                  {isUploadingThis
                                    ? "UPLOADING…"
                                    : attachedImg
                                      ? "CHANGE IMG"
                                      : "ATTACH IMG"}
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={
                                      uploadingLinkedinImageKey !== null
                                    }
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file)
                                        handleUploadLinkedinQueueImage(
                                          file,
                                          topic,
                                        );
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextQueue = linkedinQueue.filter(
                                      (_, i) => i !== idx,
                                    );
                                    const nextImages = { ...topicImages };
                                    delete nextImages[topic];
                                    updateConfigDraft({
                                      ...config,
                                      linkedinTopicsQueue: nextQueue,
                                      linkedinTopicImages: nextImages,
                                    });
                                    void handleSaveConfig({
                                      linkedinTopicsQueue: nextQueue,
                                      linkedinTopicImages: nextImages,
                                    });
                                  }}
                                  className="text-red-400 font-mono text-xs hover:underline cursor-pointer"
                                >
                                  ×
                                </button>
                              </div>

                              {attachedImg ? (
                                <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-emerald-500/30">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img
                                      src={attachedImg}
                                      alt={topic}
                                      className="w-9 h-9 rounded object-cover border border-white/[0.1] shrink-0"
                                    />
                                    <div className="min-w-0">
                                      <span className="block font-mono text-[8px] text-emerald-400 font-bold">
                                        AUTHENTIC CLOUDINARY IMAGE ATTACHED
                                      </span>
                                      <a
                                        href={attachedImg}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block font-mono text-[8px] text-[#888] hover:text-paper truncate"
                                      >
                                        {attachedImg}
                                      </a>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveLinkedinQueueImage(topic)
                                    }
                                    className="px-2 py-0.5 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 font-mono text-[8px] text-red-300 cursor-pointer shrink-0"
                                  >
                                    REMOVE IMG
                                  </button>
                                </div>
                              ) : (
                                <div className="font-mono text-[8px] text-[#666] pl-1">
                                  No image attached — will run as text-only
                                  LinkedIn post
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {linkedinQueue.length === 0 && (
                          <p className="font-mono text-[9px] text-[#666] py-2 text-center">
                            All LinkedIn cues fulfilled — AI will auto-generate{" "}
                            {linkedinSlots} new topic(s) for the next cycle.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Niche Pillars */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <label className="block font-mono text-[8px] text-[#888] uppercase">
                    Niche Pillars (Comma-separated · Used by AI to Auto-Generate
                    Weekly DEV.to &amp; LinkedIn Queues)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newKeyword.trim()) {
                          e.preventDefault();
                          const parsed = newKeyword
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean);
                          if (parsed.length === 0) return;
                          const existingLower = new Set(
                            config.nicheKeywords.map((k) => k.toLowerCase()),
                          );
                          const uniqueNew = parsed.filter(
                            (k) => !existingLower.has(k.toLowerCase()),
                          );
                          if (uniqueNew.length > 0) {
                            setConfig({
                              ...config,
                              nicheKeywords: [
                                ...config.nicheKeywords,
                                ...uniqueNew,
                              ],
                            });
                          }
                          setNewKeyword("");
                        }
                      }}
                      placeholder="e.g. WebAssembly, Rust in Frontend, Edge Computing (comma-separated)"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newKeyword.trim()) return;
                        const parsed = newKeyword
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (parsed.length === 0) return;
                        const existingLower = new Set(
                          config.nicheKeywords.map((k) => k.toLowerCase()),
                        );
                        const uniqueNew = parsed.filter(
                          (k) => !existingLower.has(k.toLowerCase()),
                        );
                        if (uniqueNew.length > 0) {
                          setConfig({
                            ...config,
                            nicheKeywords: [
                              ...config.nicheKeywords,
                              ...uniqueNew,
                            ],
                          });
                        }
                        setNewKeyword("");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 font-mono text-[9px] text-paper cursor-pointer"
                    >
                      + ADD
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {config.nicheKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 font-mono text-[9px] text-[#ccc]"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              nicheKeywords: config.nicheKeywords.filter(
                                (_, idx) => idx !== i,
                              ),
                            })
                          }
                          className="text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="font-mono text-[8px] text-[#666]">
                  CRON WEBHOOK: <code>/api/cron/blog-automation</code>
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveConfig()}
                  disabled={savingConfig}
                  className="px-4 py-2 rounded-xl bg-white text-[#09090b] font-mono text-[9px] font-bold cursor-pointer"
                >
                  SAVE QUEUES
                </button>
              </div>
            </div>
          </div>

          {/* Live Inline Debug Trace Preview */}
          <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/12 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-[0.1em]">
                  LIVE AUTOMATION EXECUTION &amp; DEBUG LOGS ({logs.length})
                </span>
                <span className="font-mono text-[8px] text-[#777]">
                  (Also logged in server terminal with timestamps &amp; step
                  durations)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadAll()}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-paper cursor-pointer"
                >
                  ↻ REFRESH
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSubTab("logs")}
                  className="px-2.5 py-1 rounded-lg bg-ember/15 hover:bg-ember/25 border border-ember/30 font-mono text-[8px] text-zinc-200 font-bold cursor-pointer"
                >
                  OPEN FULL DEBUG CONSOLE →
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto font-mono text-[10px] pr-1">
              {logs.slice(0, 10).map((entry) => (
                <div
                  key={entry.id}
                  className={`flex flex-wrap items-start gap-2 px-3 py-1.5 rounded-lg border ${
                    entry.level === "error"
                      ? "bg-red-950/30 border-red-500/30 text-red-200"
                      : entry.level === "warn"
                        ? "bg-amber-950/25 border-amber-500/30 text-amber-200"
                        : entry.level === "success"
                          ? "bg-emerald-950/20 border-emerald-500/25 text-emerald-200"
                          : "bg-[#151412] border-white/8 text-[#ccc]"
                  }`}
                >
                  <span className="text-[8px] text-[#777] shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-[8px] uppercase font-bold shrink-0">
                    {entry.pipeline}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-black/40 text-[8px] font-bold shrink-0">
                    {entry.step}
                  </span>
                  {entry.durationMs !== undefined && (
                    <span className="text-[8px] text-zinc-200 font-bold shrink-0">
                      +{entry.durationMs}ms
                    </span>
                  )}
                  <span className="flex-1 break-words text-[10px]">
                    {entry.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <p className="text-[#666] text-[10px] py-3 text-center">
                  No automation logs yet. Run Blog Automation, LinkedIn
                  Automation, or AI Weekly Queue generation above to watch the
                  step-by-step execution trace.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 2: PLATFORM MASTER PROMPTS STUDIO
      ════════════════════════════════════════════════════════════════ */}
      {subTab === "prompts" && (
        <div className="space-y-6 p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-medium text-paper">
                Platform-Tailored Master Prompts
              </h3>
              <p className="font-mono text-[9px] text-[#888] mt-0.5">
                Customize the exact persona and formatting rules for your Blog,
                LinkedIn (Official &amp; Executive), Cover Images, and Comment
                Replies.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  updateConfigDraft({
                    ...config,
                    masterPrompts: DEFAULT_MASTER_PROMPTS,
                  })
                }
                className="px-3.5 py-2 rounded-xl border border-white/[0.1] font-mono text-[9px] text-[#aaa] hover:text-paper cursor-pointer"
              >
                RESET TO DEFAULTS
              </button>
              <button
                type="button"
                onClick={() => handleSaveConfig()}
                disabled={savingConfig}
                className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold cursor-pointer"
              >
                {savingConfig ? "SAVING…" : "SAVE MASTER PROMPTS"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="block font-mono text-[9px] text-zinc-200 uppercase mb-1.5 font-bold">
                1. Blog Article Master Prompt (Deep Technical & Pragmatic)
              </label>
              <textarea
                rows={9}
                value={config.masterPrompts.blogMasterPrompt}
                onChange={(e) =>
                  updateConfigDraft((prev) => ({
                    ...prev,
                    masterPrompts: {
                      ...prev.masterPrompts,
                      blogMasterPrompt: e.target.value,
                    },
                  }))
                }
                className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono leading-relaxed focus:border-white/25 outline-none"
              />
            </div>

            <div>
              <label className="block font-mono text-[9px] text-zinc-200 uppercase mb-1.5 font-bold">
                2. LinkedIn Master Prompt (Official, Executive & Structured)
              </label>
              <textarea
                rows={9}
                value={config.masterPrompts.linkedinMasterPrompt}
                onChange={(e) =>
                  updateConfigDraft((prev) => ({
                    ...prev,
                    masterPrompts: {
                      ...prev.masterPrompts,
                      linkedinMasterPrompt: e.target.value,
                    },
                  }))
                }
                className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono leading-relaxed focus:border-white/25 outline-none"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block font-mono text-[9px] text-emerald-400 uppercase mb-1.5 font-bold">
                3. Free AI Cover Image Master Prompt (Flux / Pollinations)
              </label>
              <textarea
                rows={5}
                value={config.masterPrompts.imageMasterPrompt}
                onChange={(e) =>
                  updateConfigDraft((prev) => ({
                    ...prev,
                    masterPrompts: {
                      ...prev.masterPrompts,
                      imageMasterPrompt: e.target.value,
                    },
                  }))
                }
                className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono leading-relaxed focus:border-white/25 outline-none"
              />
            </div>
          </div>

          {/* Comment Reply Master Prompts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <label className="block font-mono text-[8px] text-zinc-200 uppercase mb-1 font-bold">
                LinkedIn Comment Reply Prompt (Official &amp; Executive)
              </label>
              <textarea
                rows={4}
                value={config.masterPrompts.commentReplyLinkedinPrompt}
                onChange={(e) =>
                  updateConfigDraft((prev) => ({
                    ...prev,
                    masterPrompts: {
                      ...prev.masterPrompts,
                      commentReplyLinkedinPrompt: e.target.value,
                    },
                  }))
                }
                className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[11px] text-paper font-mono focus:border-white/25 outline-none"
              />
            </div>
            <div>
              <label className="block font-mono text-[8px] text-zinc-200 uppercase mb-1 font-bold">
                DEV.to Comment Reply Prompt (Deep Technical)
              </label>
              <textarea
                rows={4}
                value={config.masterPrompts.commentReplyDevtoPrompt}
                onChange={(e) =>
                  updateConfigDraft((prev) => ({
                    ...prev,
                    masterPrompts: {
                      ...prev.masterPrompts,
                      commentReplyDevtoPrompt: e.target.value,
                    },
                  }))
                }
                className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-[11px] text-paper font-mono focus:border-white/25 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 3: LINKEDIN & X SOCIAL POSTS + COMMENTS & REACTIONS
      ════════════════════════════════════════════════════════════════ */}
      {subTab === "social" && (
        <div className="space-y-6">
          {/* LinkedIn OAuth 2.0 + OpenID Connect + Posts API Verification Card */}
          <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-sky-500/30 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-mono text-[9px] text-zinc-200 font-bold uppercase tracking-wider">
                    in LINKEDIN OAUTH 2.0 &amp; POSTS API VERIFICATION
                  </span>
                  {providers?.linkedinAuth?.connected ? (
                    <span className="font-mono text-[8px] px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      ● VERIFIED: {providers.linkedinAuth.name} (
                      {providers.linkedinAuth.personUrn}) ·{" "}
                      {providers.linkedinAuth.daysRemaining} DAYS LEFT ON 60-DAY
                      TOKEN
                    </span>
                  ) : providers?.linkedinAuth?.expired ? (
                    <span className="font-mono text-[8px] px-2.5 py-0.5 rounded-full border border-red-500/40 text-red-300 bg-red-500/10">
                      ⚠ 60-DAY LINKEDIN TOKEN EXPIRED — CLICK VERIFY TO REFRESH
                    </span>
                  ) : (
                    <span className="font-mono text-[8px] px-2.5 py-0.5 rounded-full border border-amber-500/40 text-amber-300 bg-amber-500/10">
                      ○ NOT VERIFIED YET — ADD CLIENT ID &amp; SECRET THEN CLICK
                      VERIFY
                    </span>
                  )}
                </div>
                <p className="font-mono text-[9px] text-[#999] leading-relaxed">
                  1. In LinkedIn Developer Portal → <strong>Products</strong>:
                  enable{" "}
                  <code className="text-zinc-300">Share on LinkedIn</code> &amp;{" "}
                  <code className="text-zinc-300">
                    Sign In with LinkedIn using OpenID Connect
                  </code>{" "}
                  (scopes: <code>openid profile email w_member_social</code>).
                  <br />
                  2. In <strong>Auth</strong> tab: add the exact Redirect URL
                  below and copy <code>LINKEDIN_CLIENT_ID</code> &amp;{" "}
                  <code>LINKEDIN_CLIENT_SECRET</code> to <code>.env.local</code>
                  .
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/api/auth/linkedin"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold tracking-[0.06em] transition-colors"
                >
                  {providers?.linkedinAuth?.connected
                    ? "REFRESH 60-DAY LINKEDIN OAUTH TOKEN"
                    : "VERIFY LINKEDIN ACCOUNT VIA OAUTH 2.0"}
                </a>
              </div>
            </div>

            {/* Exact Redirect URL Copy Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <span className="font-mono text-[8px] text-[#888] uppercase">
                LINKEDIN AUTH REDIRECT URL:
              </span>
              <code className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 font-mono text-[10px] text-zinc-300">
                {providers?.linkedinAuth?.redirectUri ||
                  (typeof window !== "undefined"
                    ? `${window.location.origin}/api/auth/linkedin/callback`
                    : "/api/auth/linkedin/callback")}
              </code>
              <button
                type="button"
                onClick={() => {
                  const uri =
                    providers?.linkedinAuth?.redirectUri ||
                    `${window.location.origin}/api/auth/linkedin/callback`;
                  navigator.clipboard.writeText(uri);
                  showToast("Copied LinkedIn Redirect URL");
                }}
                className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 font-mono text-[8px] text-paper cursor-pointer"
              >
                COPY REDIRECT URL
              </button>
              {providers?.linkedinAuth?.expiresAt && (
                <span className="ml-auto font-mono text-[8px] text-[#777]">
                  Token Expires:{" "}
                  {new Date(
                    providers.linkedinAuth.expiresAt,
                  ).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Generate LinkedIn Posts for any Article */}
          <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-paper">
                Generate Official LinkedIn Companion Post
              </h3>
              <p className="font-mono text-[9px] text-[#888]">
                Select any blog article to craft an executive-ready LinkedIn
                post using your LinkedIn Master Prompt.
              </p>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                value={selectedSlugForSocial}
                onChange={(e) => setSelectedSlugForSocial(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono focus:border-white/25 outline-none max-w-xs"
              >
                {blogs.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleGenerateSocialForBlog}
                disabled={generatingSocial || !selectedSlugForSocial}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold cursor-pointer disabled:opacity-50"
              >
                {generatingSocial ? "CRAFTING POST…" : "GENERATE LINKEDIN POST"}
              </button>
            </div>
          </div>

          {/* Generated Social Posts List */}
          <div className="space-y-4">
            {socialPosts.map((post) => (
              <div
                key={post.id}
                className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                  <div>
                    <span className="font-mono text-[8px] text-zinc-200 uppercase tracking-widest">
                      SOCIAL CAMPAIGN ·{" "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                    <h4 className="text-sm font-medium text-paper mt-0.5">
                      {post.articleTitle}
                    </h4>
                  </div>

                  {/* Reactions, Reputation Guardrail & Review Email Summary */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.safetyCheck && !post.safetyCheck.passed ? (
                      <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40 font-mono text-[8px] text-red-300 font-bold">
                        ⚠ FLAGGED WORDS: [
                        {post.safetyCheck.flaggedWords.join(", ").toUpperCase()}
                        ] — EDIT BEFORE POSTING
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 font-mono text-[8px] text-emerald-400">
                        REPUTATION GUARDRAIL: PASSED
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSendReviewEmail(post)}
                      disabled={publishingSocialId === `${post.id}-email`}
                      className="px-2.5 py-1 rounded-lg bg-ember/15 hover:bg-ember/25 border border-white/[0.12] font-mono text-[8px] text-zinc-200 font-bold cursor-pointer"
                    >
                      {publishingSocialId === `${post.id}-email`
                        ? "SENDING REVIEW EMAIL…"
                        : post.reviewEmailSent
                          ? "RESEND REVIEW EMAIL TO ME"
                          : "EMAIL ME FOR REVIEW"}
                    </button>

                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-[8px] text-[#ccc]">
                      ♥ DEV.TO REACTIONS:{" "}
                      <strong className="text-zinc-200">
                        {post.reactions?.devtoReactions || 0}
                      </strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-[8px] text-[#ccc]">
                      COMMENTS:{" "}
                      <strong className="text-zinc-200">
                        {post.reactions?.devtoComments || 0}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* LinkedIn Official Card */}
                <div className="p-4 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[9px] text-zinc-200 font-bold">
                      in LINKEDIN POST (OFFICIAL &amp; EXECUTIVE)
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 font-mono text-[8px] text-zinc-300 font-bold cursor-pointer">
                        {uploadingLinkedinImageKey === `post-${post.id}`
                          ? "UPLOADING…"
                          : post.linkedinImageUrl
                            ? "CHANGE ATTACHED IMAGE"
                            : "ATTACH AUTHENTIC IMAGE"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLinkedinImageKey !== null}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              handleUploadSocialPostImage(file, post.id);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <span className="font-mono text-[8px] px-2 py-0.5 rounded bg-sky-500/10 text-zinc-300">
                        {post.linkedinStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Attached Image Preview (or explicit Text-Only indicator) */}
                  {post.linkedinImageUrl ? (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-emerald-500/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={post.linkedinImageUrl}
                          alt={post.articleTitle}
                          className="w-14 h-14 rounded-lg object-cover border border-white/[0.1] shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="block font-mono text-[8px] text-emerald-400 font-bold">
                            AUTHENTIC IMAGE ATTACHED (WILL UPLOAD &amp; POST
                            WITH LINKEDIN UPDATE)
                          </span>
                          <a
                            href={post.linkedinImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block font-mono text-[8px] text-[#888] hover:text-paper truncate mt-0.5"
                          >
                            {post.linkedinImageUrl}
                          </a>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateSocialRecord(post.id, {
                            linkedinImageUrl: "",
                          })
                        }
                        className="px-2.5 py-1 rounded bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 font-mono text-[8px] text-red-300 cursor-pointer shrink-0"
                      >
                        REMOVE IMAGE
                      </button>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/8 font-mono text-[8px] text-[#777]">
                      No image attached — will publish to LinkedIn as a
                      text-only post (no AI image fallback).
                    </div>
                  )}

                  <textarea
                    rows={7}
                    value={post.linkedinContent}
                    onChange={(e) =>
                      setSocialPosts((prev) =>
                        prev.map((p) =>
                          p.id === post.id
                            ? { ...p, linkedinContent: e.target.value }
                            : p,
                        ),
                      )
                    }
                    className="w-full p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-paper leading-relaxed focus:border-white/25 outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSocialRecord(post.id, {
                          linkedinContent: post.linkedinContent,
                        })
                      }
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-paper cursor-pointer"
                    >
                      SAVE TEXT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(post.linkedinContent);
                        showToast("Copied LinkedIn post");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-paper cursor-pointer"
                    >
                      COPY
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleUpdateSocialRecord(post.id, {
                          linkedinContent: post.linkedinContent,
                        });
                        window.location.href = `/api/auth/linkedin?postId=${encodeURIComponent(
                          post.id,
                        )}&autoPublish=true`;
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[8px] font-bold cursor-pointer"
                      title="Runs the LinkedIn OAuth verification flow in your browser, exchanges the code & /v2/userinfo person ID, and publishes directly to your LinkedIn profile"
                    >
                      VERIFY VIA OAUTH &amp; PUBLISH
                    </button>
                    {providers?.linkedinAuth?.connected && (
                      <button
                        type="button"
                        onClick={() => handlePublishSocialApi(post, "linkedin")}
                        disabled={publishingSocialId === `${post.id}-linkedin`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-mono text-[8px] font-bold cursor-pointer"
                        title="Publishes immediately using your active 60-day LinkedIn OAuth member token"
                      >
                        {publishingSocialId === `${post.id}-linkedin`
                          ? "POSTING…"
                          : "PUBLISH (60-DAY TOKEN)"}
                      </button>
                    )}
                    {post.linkedinPostUrl && (
                      <a
                        href={post.linkedinPostUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[8px] text-emerald-400 hover:underline"
                      >
                        ● VIEW LIVE POST ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Comments & Reactions Manager (Separated LinkedIn & DEV.to Workspaces) */}
          {(() => {
            const linkedinComments = comments.filter(
              (c) => c.platform === "linkedin",
            );
            const devtoComments = comments.filter(
              (c) => c.platform === "devto",
            );
            return (
              <div className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-medium text-paper">
                        Comments &amp; Engagement Studio
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-500/30 font-mono text-[8px] text-zinc-300 font-bold">
                        in LINKEDIN ({linkedinComments.length})
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-ember/15 border border-ember/30 font-mono text-[8px] text-zinc-200 font-bold">
                        DEV.TO ({devtoComments.length})
                      </span>
                    </div>
                    <p className="font-mono text-[9px] text-[#888] mt-1">
                      Separate engagement panels for LinkedIn executive replies
                      &amp; DEV.to deep technical discussions.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncComments}
                    disabled={syncingComments}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/[0.1] font-mono text-[9px] text-paper cursor-pointer disabled:opacity-50"
                  >
                    {syncingComments
                      ? "SYNCING DEV.TO & LINKEDIN…"
                      : "SYNC LIVE COMMENTS & REACTIONS"}
                  </button>
                </div>

                {/* Split 2-Column Workspace: LinkedIn Left | DEV.to Right */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* ─── LEFT PANEL: LINKEDIN COMMENTS ─── */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] space-y-4 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-sky-500/20">
                      <div>
                        <span className="font-mono text-[10px] text-zinc-200 font-bold uppercase tracking-wider">
                          in LINKEDIN COMMENTS ({linkedinComments.length})
                        </span>
                        <p className="font-mono text-[8px] text-[#8aa0b5] mt-0.5">
                          Official, executive &amp; career-safe AI replies for
                          LinkedIn discussions.
                        </p>
                      </div>
                    </div>

                    {linkedinSyncNotice && (
                      <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 font-mono text-[8px] text-sky-200 leading-relaxed">
                        ℹ {linkedinSyncNotice}
                      </div>
                    )}

                    {/* LinkedIn Comment Composer */}
                    <div className="p-3.5 rounded-xl bg-white/[0.03] border border-sky-500/20 space-y-2.5">
                      <span className="block font-mono text-[8px] text-zinc-300 uppercase tracking-wider font-bold">
                        + Craft LinkedIn Executive Reply
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={linkedinCommentInput.authorName}
                          onChange={(e) =>
                            setLinkedinCommentInput({
                              ...linkedinCommentInput,
                              authorName: e.target.value,
                            })
                          }
                          placeholder="LinkedIn Commenter Name"
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                        <input
                          type="text"
                          value={linkedinCommentInput.articleTitle}
                          onChange={(e) =>
                            setLinkedinCommentInput({
                              ...linkedinCommentInput,
                              articleTitle: e.target.value,
                            })
                          }
                          placeholder="LinkedIn Post Title / Topic"
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                      </div>
                      <div className="flex max-sm:flex-col gap-2">
                        <input
                          type="text"
                          value={linkedinCommentInput.commentText}
                          onChange={(e) =>
                            setLinkedinCommentInput({
                              ...linkedinCommentInput,
                              commentText: e.target.value,
                            })
                          }
                          placeholder="Paste their LinkedIn comment here…"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAndReplyComment("linkedin")}
                          disabled={generatingReplyId === "new-linkedin"}
                          className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          {generatingReplyId === "new-linkedin"
                            ? "CRAFTING…"
                            : "LINKEDIN REPLY"}
                        </button>
                      </div>
                    </div>

                    {/* LinkedIn Comments List */}
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {linkedinComments.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-white/[0.03] border border-sky-500/20 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-zinc-300 font-mono text-[8px] font-bold uppercase">
                                  LINKEDIN
                                </span>
                                <span className="text-xs font-semibold text-paper">
                                  {c.authorName}
                                </span>
                              </div>
                              <p className="font-mono text-[8px] text-[#7c90a3] truncate mt-0.5">
                                on {c.articleTitle}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.externalUrl && (
                                <a
                                  href={c.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[8px] text-zinc-200 hover:underline"
                                >
                                  OPEN POST ↗
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRegenerateReply(c)}
                                disabled={generatingReplyId === c.id}
                                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-paper cursor-pointer"
                              >
                                {generatingReplyId === c.id
                                  ? "⏳…"
                                  : "AI REPLY"}
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-[#d1d9e0] bg-white/[0.04] p-3 rounded-lg border border-white/5">
                            “{c.commentText}”
                          </p>

                          {c.aiSuggestedReply && (
                            <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[8px] text-zinc-300 font-bold uppercase">
                                  Suggested Executive LinkedIn Reply:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      c.aiSuggestedReply!,
                                    );
                                    showToast("Copied LinkedIn reply");
                                  }}
                                  className="px-2.5 py-0.5 rounded bg-white text-[#09090b] font-mono text-[8px] font-bold cursor-pointer"
                                >
                                  COPY REPLY
                                </button>
                              </div>
                              <p className="text-xs text-paper leading-relaxed">
                                {c.aiSuggestedReply}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {linkedinComments.length === 0 && (
                        <div className="p-6 rounded-xl bg-white/[0.03] border border-white/5 text-center space-y-1.5">
                          <p className="font-mono text-[10px] text-[#8aa0b5]">
                            No LinkedIn comments tracked yet.
                          </p>
                          <p className="font-mono text-[8px] text-[#667788] leading-relaxed">
                            Note: LinkedIn&apos;s standard self-serve OAuth only
                            grants write permission (w_member_social). Paste any
                            LinkedIn comment above to generate &amp; copy an
                            executive reply.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ─── RIGHT PANEL: DEV.TO COMMENTS ─── */}
                  <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] space-y-4 flex flex-col">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-ember/20">
                      <div>
                        <span className="font-mono text-[10px] text-zinc-200 font-bold uppercase tracking-wider">
                          DEV.TO COMMENTS ({devtoComments.length})
                        </span>
                        <p className="font-mono text-[8px] text-[#9b8d83] mt-0.5">
                          Live synced comments from your DEV.to articles with
                          technical AI replies.
                        </p>
                      </div>
                    </div>

                    {/* DEV.to Comment Composer */}
                    <div className="p-3.5 rounded-xl bg-white/[0.04] border border-ember/20 space-y-2.5">
                      <span className="block font-mono text-[8px] text-zinc-200 uppercase tracking-wider font-bold">
                        + Craft DEV.to Technical Reply
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={devtoCommentInput.authorName}
                          onChange={(e) =>
                            setDevtoCommentInput({
                              ...devtoCommentInput,
                              authorName: e.target.value,
                            })
                          }
                          placeholder="DEV.to Commenter (@handle)"
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                        <input
                          type="text"
                          value={devtoCommentInput.articleTitle}
                          onChange={(e) =>
                            setDevtoCommentInput({
                              ...devtoCommentInput,
                              articleTitle: e.target.value,
                            })
                          }
                          placeholder="DEV.to Article Title"
                          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                      </div>
                      <div className="flex max-sm:flex-col gap-2">
                        <input
                          type="text"
                          value={devtoCommentInput.commentText}
                          onChange={(e) =>
                            setDevtoCommentInput({
                              ...devtoCommentInput,
                              commentText: e.target.value,
                            })
                          }
                          placeholder="Paste a DEV.to comment here…"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-paper focus:border-white/25 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddAndReplyComment("devto")}
                          disabled={generatingReplyId === "new-devto"}
                          className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold cursor-pointer whitespace-nowrap disabled:opacity-50"
                        >
                          {generatingReplyId === "new-devto"
                            ? "CRAFTING…"
                            : "DEV.TO REPLY"}
                        </button>
                      </div>
                    </div>

                    {/* DEV.to Comments List */}
                    <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                      {devtoComments.map((c) => (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl bg-white/[0.04] border border-ember/20 space-y-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-ember/20 text-zinc-200 font-mono text-[8px] font-bold uppercase">
                                  DEV.TO
                                </span>
                                <span className="text-xs font-semibold text-paper">
                                  {c.authorName}
                                </span>
                              </div>
                              <p className="font-mono text-[8px] text-[#777] truncate mt-0.5">
                                on {c.articleTitle}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.externalUrl && (
                                <a
                                  href={c.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-[8px] text-zinc-200 hover:underline"
                                >
                                  VIEW ON DEV.TO ↗
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRegenerateReply(c)}
                                disabled={generatingReplyId === c.id}
                                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 font-mono text-[8px] text-paper cursor-pointer"
                              >
                                {generatingReplyId === c.id
                                  ? "⏳…"
                                  : "AI REPLY"}
                              </button>
                            </div>
                          </div>

                          <p className="text-xs text-[#ccc] bg-white/[0.04] p-3 rounded-lg border border-white/5">
                            “{c.commentText}”
                          </p>

                          {c.aiSuggestedReply && (
                            <div className="p-3 rounded-lg bg-ember/10 border border-ember/30 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[8px] text-zinc-200 font-bold uppercase">
                                  Suggested Technical DEV.to Reply:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(
                                      c.aiSuggestedReply!,
                                    );
                                    showToast("Copied DEV.to reply");
                                  }}
                                  className="px-2.5 py-0.5 rounded bg-white text-[#09090b] font-mono text-[8px] font-bold cursor-pointer"
                                >
                                  COPY REPLY
                                </button>
                              </div>
                              <p className="text-xs text-paper leading-relaxed">
                                {c.aiSuggestedReply}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      {devtoComments.length === 0 && (
                        <div className="p-6 rounded-xl bg-white/[0.04] border border-white/5 text-center">
                          <p className="font-mono text-[10px] text-[#777]">
                            No DEV.to comments yet. Click &ldquo;Sync Live
                            Comments &amp; Reactions&rdquo; above.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 4: NEWSLETTER SUBSCRIBERS & EMAIL SETUP (GMAIL / RESEND)
      ════════════════════════════════════════════════════════════════ */}
      {subTab === "newsletter" && (
        <div className="space-y-6">
          {/* Email Provider Status Banner */}
          <div className="p-5 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[9px] text-paper font-bold uppercase">
                  GLOBAL EMAIL ENGINE:
                </span>
                <span
                  className={`font-mono text-[8px] px-2.5 py-0.5 rounded-full border ${
                    providers?.email?.activeProvider !== "none"
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : "border-amber-500/40 text-amber-300 bg-amber-500/10"
                  }`}
                >
                  {providers?.email?.activeProvider === "gmail"
                    ? `● GMAIL FREE SMTP ACTIVE (${providers.email.gmail?.user})`
                    : providers?.email?.activeProvider === "resend"
                      ? `● RESEND API ACTIVE (${providers.email.resend?.fromEmail})`
                      : "○ READY FOR GMAIL APP PASSWORD OR RESEND KEY"}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#888]">
                No custom domain yet? Set <code>GMAIL_USER</code> &amp;{" "}
                <code>GMAIL_APP_PASSWORD</code> in <code>.env.local</code> for
                100% free Gmail sending. When you get a domain, set{" "}
                <code>RESEND_API_KEY</code> &amp;{" "}
                <code>EMAIL_PROVIDER=resend</code> to switch seamlessly.
              </p>
            </div>

            {/* Manual Article Blast */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedSlugForBlast}
                onChange={(e) => setSelectedSlugForBlast(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono max-w-xs"
              >
                {blogs.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSendNewsletterBlast}
                disabled={sendingBlast || !selectedSlugForBlast}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold cursor-pointer disabled:opacity-50"
              >
                {sendingBlast
                  ? "SENDING…"
                  : `SEND ARTICLE TO LIST (${subscribers.length})`}
              </button>
            </div>
          </div>

          {/* Add Emails from Admin + Subscriber List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Add Subscriber(s) Box */}
            <div className="p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
              <div>
                <h3 className="text-base font-medium text-paper">
                  Add Subscriber Emails
                </h3>
                <p className="font-mono text-[9px] text-[#888] mt-0.5">
                  Add one or multiple emails (comma or newline separated)
                  directly to your newsletter list.
                </p>
              </div>
              <textarea
                rows={5}
                value={bulkEmailsInput}
                onChange={(e) => setBulkEmailsInput(e.target.value)}
                placeholder={
                  "reader1@gmail.com\nreader2@company.com, friend@domain.com"
                }
                className="w-full p-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono focus:border-white/25 outline-none"
              />
              <button
                type="button"
                onClick={handleAddSubscribersFromAdmin}
                disabled={addingEmails || !bulkEmailsInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-[#09090b] font-mono text-[9px] font-bold tracking-[0.08em] cursor-pointer disabled:opacity-50"
              >
                {addingEmails ? "ADDING…" : "+ ADD TO NEWSLETTER LIST"}
              </button>
            </div>

            {/* Subscribers Table */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white/[0.04] backdrop-blur-2xl border border-white/[0.09] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-medium text-paper">
                  Subscriber List ({filteredSubscribers.length})
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={subscriberSearch}
                    onChange={(e) => setSubscriberSearch(e.target.value)}
                    placeholder="Filter emails…"
                    className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-paper font-mono focus:border-white/25 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const csv = subscribers
                        .map((s) => `${s.email},${s.source},${s.subscribedAt}`)
                        .join("\n");
                      navigator.clipboard.writeText(csv);
                      showToast("Copied subscriber list as CSV");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 font-mono text-[8px] text-paper cursor-pointer"
                  >
                    COPY CSV
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filteredSubscribers.map((sub) => (
                  <div
                    key={sub.email}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-paper truncate">
                        {sub.email}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[8px] text-zinc-200 uppercase">
                          {sub.source === "frontend"
                            ? "CURVED INPUT (FRONTEND)"
                            : "ADMIN ADDED"}
                        </span>
                        <span className="font-mono text-[8px] text-[#666]">
                          · {new Date(sub.subscribedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteSubscriberEmail(sub.email)}
                      className="text-red-400 font-mono text-[9px] hover:underline cursor-pointer"
                    >
                      REMOVE
                    </button>
                  </div>
                ))}
                {filteredSubscribers.length === 0 && (
                  <p className="text-center font-mono text-xs text-[#666] py-10">
                    No subscribers yet. Visitors can subscribe via the
                    CurvedInput widget on your blog, or add emails on the left.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          SUB-TAB 5: AUTOMATION EXECUTION & DEBUG LOGS CONSOLE
      ════════════════════════════════════════════════════════════════ */}
      {subTab === "logs" && (
        <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.09] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h3 className="text-base font-medium text-paper">
                Automation Step-by-Step Debug &amp; Execution Console (
                {filteredLogs.length})
              </h3>
              <p className="font-mono text-[9px] text-[#777] mt-0.5">
                Every pipeline stage (Weekly AI Queues, Gemini / Pollinations
                text &amp; image generation, Cloudinary upload, DEV.to sync,
                LinkedIn review email &amp; Cron checks) is logged here and in
                your server terminal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[
                "all",
                "blog",
                "linkedin",
                "weekly-queue",
                "image",
                "cron",
                "system",
              ].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setLogFilterPipeline(p)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[8px] uppercase cursor-pointer border ${
                    logFilterPipeline === p
                      ? "bg-white text-[#09090b] border-ember font-bold"
                      : "bg-white/[0.03] backdrop-blur-xl text-[#999] border-white/10 hover:text-paper"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadAll()}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 font-mono text-[8px] text-paper cursor-pointer"
              >
                ↻ REFRESH
              </button>
              <button
                type="button"
                onClick={handleClearLogs}
                disabled={clearingLogs || logs.length === 0}
                className="px-3 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 font-mono text-[8px] text-red-300 cursor-pointer disabled:opacity-40"
              >
                {clearingLogs ? "CLEARING…" : "CLEAR LOGS"}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1 font-mono">
            {filteredLogs.map((entry) => (
              <div
                key={entry.id}
                className={`p-3 rounded-xl border space-y-1.5 ${
                  entry.level === "error"
                    ? "bg-red-950/35 border-red-500/35 text-red-100"
                    : entry.level === "warn"
                      ? "bg-amber-950/30 border-amber-500/35 text-amber-100"
                      : entry.level === "success"
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                        : "bg-white/[0.03] backdrop-blur-xl border-white/10 text-paper"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                        entry.level === "error"
                          ? "bg-red-500 text-black"
                          : entry.level === "warn"
                            ? "bg-amber-400 text-black"
                            : entry.level === "success"
                              ? "bg-emerald-400 text-black"
                              : "bg-white/15 text-paper"
                      }`}
                    >
                      {entry.level}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/10 text-[8px] uppercase font-bold">
                      {entry.pipeline}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-black/50 text-[9px] text-zinc-200 font-bold">
                      {entry.step}
                    </span>
                    {entry.durationMs !== undefined && (
                      <span className="text-[9px] text-zinc-300 font-bold">
                        +{entry.durationMs}ms
                      </span>
                    )}
                  </div>
                  <span className="text-[8px] text-[#888]">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs leading-relaxed break-words">
                  {entry.message}
                </p>

                {entry.meta && Object.keys(entry.meta).length > 0 && (
                  <details className="pt-1">
                    <summary className="text-[9px] text-[#999] hover:text-paper cursor-pointer select-none">
                      Inspect step metadata / payload (
                      {Object.keys(entry.meta).join(", ")})
                    </summary>
                    <pre className="mt-1.5 p-2.5 rounded-lg bg-black/60 border border-white/10 text-[9px] text-[#ccc] overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(entry.meta, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}

            {filteredLogs.length === 0 && (
              <p className="text-center text-xs text-[#666] py-12">
                No log entries match the selected filter. Trigger an automation
                action to see real-time step logs.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Custom Delete Confirm Modal for Subscriber */}
      {deleteSubscriberEmail && (
        <ConfirmModal
          isOpen={true}
          title="Remove Newsletter Subscriber"
          message="Are you sure you want to remove this email address from your newsletter list?"
          itemTitle={deleteSubscriberEmail}
          itemType="SUBSCRIBER"
          confirmLabel="REMOVE SUBSCRIBER"
          variant="danger"
          onConfirm={handleConfirmDeleteSubscriber}
          onCancel={() => setDeleteSubscriberEmail(null)}
        />
      )}
    </div>
  );
}
