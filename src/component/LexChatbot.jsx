import { Fragment, useState, useRef, useEffect } from "react";
import {
    LexRuntimeV2Client,
    RecognizeTextCommand,
} from "@aws-sdk/client-lex-runtime-v2";
import {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import API_BASE_URL from "../lib/apiBaseUrl";

const env = import.meta.env;
const AWS_REGION = env.VITE_AWS_REGION?.trim() || "us-east-1";
const AGENT_ID = env.VITE_AWS_BEDROCK_AGENT_ID?.trim() || "";
const AGENT_ALIAS_ID = env.VITE_AWS_BEDROCK_AGENT_ALIAS_ID?.trim() || "";
const BOT_ID = env.VITE_AWS_LEX_BOT_ID?.trim() || "";
const BOT_ALIAS_ID = env.VITE_AWS_LEX_BOT_ALIAS_ID?.trim() || "";
const LOCALE_ID = env.VITE_AWS_LEX_LOCALE_ID?.trim() || "en_US";
const accessKeyId = env.VITE_AWS_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.VITE_AWS_SECRET_ACCESS_KEY?.trim();

const awsClientConfig = {
    region: AWS_REGION,
    ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        }
        : {}),
};

const isLexConfigured = Boolean(BOT_ID && BOT_ALIAS_ID);
const isAgentConfigured = Boolean(AGENT_ID && AGENT_ALIAS_ID);
const isChatbotConfigured = isLexConfigured && isAgentConfigured;

const agentClient = new BedrockAgentRuntimeClient(awsClientConfig);

const AGENT_TRIGGERS = ["create a trip for me", "create a wishlist for me"];

const client = new LexRuntimeV2Client(awsClientConfig);
const SUGGESTED_PROMPTS = [
    "Create a trip for me",
    "Create a wishlist for me",
    "I want to find another user",
    "I want to follow another user",
    "I want to add photos to my trip",
];

export default function LexChatbot() {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            from: "bot",
            text: isChatbotConfigured
                ? "Hi! I'm your NomadTrack assistant. How can I help? Choose an option below or type your own message."
                : "The chatbot is not configured yet. Add the required Vite env values before using Lex or Bedrock.",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const sessionId = useRef(`session-${Date.now()}`);
    const bottomRef = useRef(null);
    const agentSession = useRef(false);

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, open]);

    const handleReturnControl = async (invocationId, apiPath, properties) => {
        const token = localStorage.getItem("token");
        const body = {};
        properties.forEach(({ name, value }) => { body[name] = value; });

        const strippedPath = apiPath.replace(/^\/nomadTrack/i, "").replace(/\/wishlist$/, "/wishlists");
        try {
            await fetch(`${API_BASE_URL}${strippedPath}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            const followUp = new InvokeAgentCommand({
                agentId: AGENT_ID,
                agentAliasId: AGENT_ALIAS_ID,
                sessionId: sessionId.current,
                inputText: "",
                sessionState: {
                    invocationId,
                    returnControlInvocationResults: [{
                        apiResult: {
                            actionGroup: "TravelActions",
                            apiPath: apiPath,
                            httpMethod: "POST",
                            httpStatusCode: 201,
                            responseBody: { "application/json": { body: JSON.stringify({ success: true }) } },
                        },
                    }],
                },
            });
            const followUpResponse = await agentClient.send(followUp);
            let confirmText = "";
            for await (const event of followUpResponse.completion) {
                if (event.chunk?.bytes) {
                    confirmText += new TextDecoder().decode(event.chunk.bytes);
                }
            }
            setMessages((prev) => [...prev, { from: "bot", text: confirmText || "Done! Your request was completed successfully." }]);
        } catch {
            setMessages((prev) => [...prev, { from: "bot", text: "Something went wrong completing your request. Please try again." }]);
        }
    };

    const sendToAgent = async (text) => {
        setLoading(true);
        try {
            const command = new InvokeAgentCommand({
                agentId: AGENT_ID,
                agentAliasId: AGENT_ALIAS_ID,
                sessionId: sessionId.current,
                inputText: text,
            });
            const response = await agentClient.send(command);
            let botText = "";
            let returnControlPayload = null;
            for await (const event of response.completion) {
                if (event.chunk?.bytes) {
                    botText += new TextDecoder().decode(event.chunk.bytes);
                }
                if (event.returnControl) {
                    returnControlPayload = event.returnControl;
                }
            }
            if (returnControlPayload) {
                const input = returnControlPayload.invocationInputs?.[0]?.apiInvocationInput;
                const invocationId = returnControlPayload.invocationId;
                const apiPath = input?.apiPath;
                const properties = input?.requestBody?.content?.["application/json"]?.properties ?? [];
                await handleReturnControl(invocationId, apiPath, properties);
            } else {
                setMessages((prev) => [...prev, { from: "bot", text: botText || "Sorry, I didn't understand that." }]);
            }
        } catch {
            setMessages((prev) => [...prev, { from: "bot", text: "Something went wrong. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async (presetMessage) => {
        const text = (presetMessage ?? input).trim();
        if (!text) return;
        if (!presetMessage) setInput("");
        setMessages((prev) => [...prev, { from: "user", text }]);

        if (!isChatbotConfigured) {
            setMessages((prev) => [
                ...prev,
                {
                    from: "bot",
                    text: "Chatbot configuration is missing. Check your Vite env values for the Lex bot and Bedrock agent IDs.",
                },
            ]);
            return;
        }

        if (AGENT_TRIGGERS.includes(text.toLowerCase()) || agentSession.current) {
            agentSession.current = true;
            await sendToAgent(text);
            return;
        }

        setLoading(true);
        try {
            const command = new RecognizeTextCommand({
                botId: BOT_ID,
                botAliasId: BOT_ALIAS_ID,
                localeId: LOCALE_ID,
                sessionId: sessionId.current,
                text,
            });
            const response = await client.send(command);
            const botMessages = response.messages?.length
                ? response.messages.map((m) => ({ from: "bot", text: m.content }))
                : [{ from: "bot", text: "Sorry, I didn't understand that." }];
            setMessages((prev) => [...prev, ...botMessages]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { from: "bot", text: "Something went wrong. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter") sendMessage();
    };

    return (
        <div className="lex-chatbot">
            {open && (
                <div className="lex-chatbot__window">
                    <div className="lex-chatbot__header">
                        <span className="lex-chatbot__title">NomadTrack Assistant</span>
                        <button onClick={() => setOpen(false)} aria-label="Close chat">X</button>
                    </div>
                    <div className="lex-chatbot__messages">
                        {messages.map((msg, i) => (
                            <Fragment key={i}>
                                <div className={`lex-chatbot__msg lex-chatbot__msg--${msg.from}`}>
                                    {msg.text}
                                </div>
                                {i === 0 && (
                                    <div className="lex-chatbot__suggestions" aria-label="Suggested prompts">
                                        {SUGGESTED_PROMPTS.map((prompt) => (
                                            <button
                                                key={prompt}
                                                type="button"
                                                className="lex-chatbot__suggestion"
                                                onClick={() => sendMessage(prompt)}
                                                disabled={loading}
                                            >
                                                {prompt}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </Fragment>
                        ))}
                        {loading && <div className="lex-chatbot__msg lex-chatbot__msg--bot">...</div>}
                        <div ref={bottomRef} />
                    </div>
                    <div className="lex-chatbot__input">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Type a message..."
                            disabled={loading}
                        />
                        <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
                            Send
                        </button>
                    </div>
                </div>
            )}
            <button
                className="lex-chatbot__toggle"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Toggle chat"
            >
                Chat
            </button>
        </div>
    );
}
