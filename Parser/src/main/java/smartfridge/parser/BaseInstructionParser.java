package smartfridge.parser;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.jsoup.nodes.Document;

public interface BaseInstructionParser {
    ArrayNode parsePage(Document document, ObjectMapper mapper);
    int getPriority();
    String getName();
    boolean canParse(Document document);
}
