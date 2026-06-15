package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import org.jsoup.nodes.Document;

@Component
public class OlParser implements BaseInstructionParser {
    private static final String SELECTOR = "ol.instructions > li:not(.as-video-step, .as-ad-step)";
    @Override
    public ArrayNode parsePage(Document document, ObjectMapper mapper) {
        ArrayNode allSteps = mapper.createArrayNode();
        Elements liElements = document.select(SELECTOR);
        int stepNumber = 1;

        for (Element li : liElements) {
            Element steps = li.selectFirst("h3.r-section-header");
            Element instruction = li.selectFirst("div.instruction");
            Element step_image = li.selectFirst("a > img");

            if (steps == null) {
                continue;
            }

            ObjectNode stepNode = mapper.createObjectNode();
            stepNode.put("num", stepNumber++);
            stepNode.put("step_desc", steps.text());
            if (instruction != null) {
                stepNode.put("step_inst", instruction.text());
            }
            if (step_image != null) {
                stepNode.put("img", step_image.attr("src"));
            }
            allSteps.add(stepNode);
        }
        return allSteps;
    }
    @Override
    public int getPriority() {
        return 10;
    }

    @Override
    public String getName() {
        return "OlParser";
    }

    @Override
    public boolean canParse(Document document) {
        Elements liElements = document.select(SELECTOR);
        return !liElements.isEmpty();
    }
}
