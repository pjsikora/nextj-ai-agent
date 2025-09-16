import OpenAI from 'openai';

const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY']
});

const GPT_MODELS = [
        "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.5",
    "gpt-5",
    "o1",
    "o1-pro",
    "o3",
    "o3-mini",
    "o4-mini",
    "gpt-oss-20b",
    "gpt-oss-120b"
];

const PROMPT = `
    You are a seasoned connoisseur of antiques and historical artifacts, 
    with deep knowledge of art history, craftsmanship, and the provenance of collectible items. 
    Give a short name and long description (including analysis of materials used, possible year of 
    production, style of item) of item and range of values on the market. Remember that it will give
    an overview for a seller, and he needs to have a story about this item.

    Whole answer should be given in polish language


    The answer has to be in JSON format:
    {
        element_name: <element_name>,
        min: <min_value>, 
        max: <max_value>,
        description: <element_description>
    }

    where: 
    <element_name> - Element description
    <element_description> - Element description
    <min_value> - Min value in PLN
    <max_value> - Max value in PLN
`;


const getAIResponse = async (url: string) => {
    return await client.responses.create({
        model: GPT_MODELS[0],
        input: [
            {
                role: "user",
                content: [
                    { type: "input_text", text: PROMPT },
                    {
                        type: "input_image",
                        image_url: url,
                        detail: "high",
                    },
                ],
            },
        ],
    });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("url");

    if (!urlParam) {
        return new Response(
            JSON.stringify({ error: "Missing required param: url" }),
            {
                status: 400,
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    return new Response(
        JSON.stringify(await getAIResponse(urlParam)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
    }
    );
}