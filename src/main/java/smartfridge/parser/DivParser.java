package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import org.jsoup.nodes.Document;

@Component
public class DivParser implements BaseInstructionParser {
    private final String SELECTOR = "div.instructions > p";
    @Override
    public ArrayNode parsePage(Document document, ObjectMapper mapper) {
        ArrayNode allSteps = mapper.createArrayNode();

        Elements paragraphs = document.select(SELECTOR);

        if (paragraphs.isEmpty()) {
            System.out.println("DivParser: не найдены параграфы");
            return allSteps;
        }

        Element stepsParagraph = null;
        for (Element p : paragraphs) {
            if (p.select("br").size() > 0) {
                stepsParagraph = p;
                break;
            }
        }

        if (stepsParagraph == null && paragraphs.size() > 1) {
            stepsParagraph = paragraphs.last();
        } else if (stepsParagraph == null) {
            stepsParagraph = paragraphs.first();
        }

        String[] parts = stepsParagraph.html().split("<br\\s*/?>");

        int stepNumber = 1;
        for (String part : parts) {
            String text = part.replaceAll("<[^>]*>", "").trim();

            if (text.isEmpty() || text.length() < 10 || text.startsWith("Как ")) {
                continue;
            }

            ObjectNode stepNode = mapper.createObjectNode();
            stepNode.put("num", stepNumber);
            stepNode.put("step_desc", "Шаг " + stepNumber);
            stepNode.put("step_inst", text);
            allSteps.add(stepNode);

            stepNumber++;
        }

        System.out.println("DivParser: найдено " + (stepNumber - 1) + " шагов");
        return allSteps;
    }

    @Override
    public int getPriority() {
        return 100;
    }

    @Override
    public String getName() {
        return "DivParser";
    }

    @Override
    public boolean canParse(Document document) {
        Elements divElements = document.select(SELECTOR);
        return !divElements.isEmpty();
    }
}