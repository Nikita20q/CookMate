package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;
import org.jsoup.nodes.Document;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ParagraphListParser implements BaseInstructionParser {

    private static final String SELECTOR = "div.instructions > p";
    private static final Pattern STEP_NUMBER_PATTERN = Pattern.compile("^(\\d+)[.\\)]\\s*(.*)");

    @Override
    public boolean canParse(Document document) {
        Elements paragraphs = document.select(SELECTOR);

        if (paragraphs.size() <= 1) {
            return false;
        }

        int nonEmptyCount = 0;
        for (Element p : paragraphs) {
            String text = p.text().trim();
            if (!text.isEmpty() && text.length() > 5) {
                nonEmptyCount++;
            }
        }

        return nonEmptyCount > 1;
    }

    @Override
    public ArrayNode parsePage(Document document, ObjectMapper mapper) {
        ArrayNode allSteps = mapper.createArrayNode();
        Elements paragraphs = document.select(SELECTOR);

        int stepNumber = 1;
        for (Element p : paragraphs) {
            String text = p.text().trim();

            if (text.isEmpty()) {
                continue;
            }

            if (text.length() < 5) {
                continue;
            }

            if (text.endsWith(":") && text.length() < 20) {
                continue;
            }

            Matcher matcher = STEP_NUMBER_PATTERN.matcher(text);
            String stepText = text;

            if (matcher.matches()) {
                stepNumber = Integer.parseInt(matcher.group(1));
                stepText = matcher.group(2).trim();
            }

            ObjectNode stepNode = mapper.createObjectNode();
            stepNode.put("num", stepNumber);
            stepNode.put("stepTitle", "Шаг " + stepNumber);
            stepNode.put("stepInstruction", stepText);
            allSteps.add(stepNode);

            stepNumber++;
        }

        System.out.println("ParagraphListParser: найдено " + allSteps.size() + " шагов");
        return allSteps;
    }

    @Override
    public int getPriority() {
        return 50;
    }

    @Override
    public String getName() {
        return "ParagraphListParser";
    }
}